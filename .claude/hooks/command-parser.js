#!/usr/bin/env node
/**
 * Command Parser Hook - 斜杠命令解析器
 *
 * 在 PostToolUse 中解析用户输入，检测斜杠命令并触发模式切换
 *
 * @version 1.0
 */

const fs = require('fs');
const path = require('path');

const MODE_ROUTER_PATH = path.join(__dirname, '..', 'mode-system', 'router.js');
const SIGNAL_FILE = path.join(__dirname, '..', '.pending_signal.json');
const LAST_RECORD_FILE = path.join(__dirname, '..', '.last_record_ts.json');

// 话题切换触发词
const TOPIC_SWITCH_SIGNALS = ['换个话题', '先这样', '不管了', '先不管', '算了'];

const DEFAULT_LOOKBACK_TURNS = 10;

/**
 * 读取用户输入（UserPromptSubmit hook 格式）
 * stdin: {"session_id":"...","prompt":"...","cwd":"...","hook_event_name":"UserPromptSubmit"}
 */
function readUserInput() {
  if (process.stdin.isTTY) return null;

  try {
    let data = '';
    const buf = Buffer.alloc(4096);
    let n;
    while ((n = fs.readSync(0, buf, 0, buf.length, null)) > 0) {
      data += buf.slice(0, n).toString('utf-8');
    }
    if (data) {
      const json = JSON.parse(data);
      return json.prompt || null;
    }
  } catch (e) {
    // 忽略
  }

  return null;
}

/**
 * 检查是否为斜杠命令
 */
function isSlashCommand(text) {
  return text && text.trim().startsWith('/');
}

/**
 * 调用模式路由器
 */
function routeCommand(text) {
  try {
    // 动态加载模式路由器
    const modeRouter = require(MODE_ROUTER_PATH);
    const result = modeRouter.handleSlashCommand(text);

    // 写入信号文件供主进程读取
    if (result.handled && result.success) {
      const signal = {
        type: 'mode_switch',
        timestamp: Date.now(),
        command: text.trim().split(' ')[0],
        result: {
          mode: result.mode,
          previousMode: result.previousMode,
          alreadyActive: result.alreadyActive
        },
        message: result.message
      };

      fs.writeFileSync(SIGNAL_FILE, JSON.stringify(signal, null, 2));
    }

    return result;
  } catch (e) {
    console.error('Mode router error:', e.message);
    return { handled: false, error: e.message };
  }
}

/**
 * 直接执行记录命令（绕过 skill 匹配，减少上下文消耗）
 */
function handleDirectRecord(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/record\s*(.+)?$/);
  if (!match) return null;

  const content = match[1] || null;  // null 表示使用对话上下文
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 返回记录信号，由 Claude 直接执行
  return {
    handled: true,
    success: true,
    type: 'direct_record',
    content: content,  // null = 使用对话上下文
    time: time,
    message: content
      ? `📝 直接记录: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
      : '📝 记录对话上下文',
    suggestion: '使用 Read 读取 scratchpad.md，然后使用 Edit 追加记录'
  };
}

/**
 * 检测话题切换信号
 */
function detectTopicSwitch(text) {
  return TOPIC_SWITCH_SIGNALS.some(s => text.includes(s));
}

/**
 * 读上次记录时间戳
 */
function readLastRecordTs() {
  try {
    if (fs.existsSync(LAST_RECORD_FILE)) {
      return JSON.parse(fs.readFileSync(LAST_RECORD_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return null;
}

/**
 * 评分上一段内容是否值得记录
 */
function scorePreviousContext(transcriptPath, sinceTs) {
  let score = 0;
  const signals = [];

  try {
    if (!fs.existsSync(transcriptPath)) return { score, signals };

    const stats = fs.statSync(transcriptPath);
    const readSize = Math.min(256000, stats.size);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, Math.max(0, stats.size - readSize));
    fs.closeSync(fd);

    const lines = buf.toString('utf-8').split('\n').filter(l => l.trim());
    let entries = [];
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (!sinceTs || (e.timestamp && e.timestamp > sinceTs)) entries.push(e);
      } catch (e) { /* ignore */ }
    }
    if (!sinceTs) entries = entries.slice(-DEFAULT_LOOKBACK_TURNS * 4);

    let webCount = 0;
    let claudeChars = 0;

    for (const entry of entries) {
      if (entry.type === 'tool_use') {
        if (entry.name === 'Edit' || entry.name === 'Write') {
          score += 3;
          signals.push(`修改了文件`);
        }
        if (entry.name === 'Bash') { score += 2; signals.push('执行了命令'); }
        if (entry.name === 'WebFetch' || entry.name === 'WebSearch') webCount++;
      }
      if (entry.role === 'assistant') {
        const text = Array.isArray(entry.content)
          ? entry.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
          : String(entry.content || '');
        claudeChars += text.length;
        if (/总结|结论|建议|方案|综上/.test(text)) { score += 1; signals.push('有总结内容'); }
      }
    }

    if (webCount >= 2) { score += 2; signals.push(`${webCount}次网络查询`); }
    if (claudeChars > 500) { score += 1; signals.push('有大量分析'); }
  } catch (e) { /* ignore */ }

  return { score, signals };
}

/**
 * 主函数
 */
function main() {
  const startTime = Date.now();

  // 读取用户输入（从 stdin，UserPromptSubmit 格式）
  const userInput = readUserInput();

  if (!userInput) {
    process.exit(0);
  }

  // 话题切换检测（优先于斜杠命令）
  if (detectTopicSwitch(userInput)) {
    // 读取 transcript_path（UserPromptSubmit 也包含此字段）
    let transcriptPath = null;
    try {
      if (!process.stdin.isTTY) {
        // stdin 已在 readUserInput 中消费，尝试从环境变量获取
        transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH || null;
      }
    } catch (e) { /* ignore */ }

    if (transcriptPath) {
      const lastRecord = readLastRecordTs();
      const { score, signals } = scorePreviousContext(transcriptPath, lastRecord?.timestamp);

      if (score >= 3) {
        const desc = signals.slice(0, 2).join('、');
        process.stderr.write(
          `[话题切换] 上一段有：${desc}，请在回复前先问用户："上一段要记录吗？"`
        );
        process.exit(2);
      }
    }
    process.exit(0);
  }

  // 检查是否为斜杠命令
  if (!isSlashCommand(userInput)) {
    process.exit(0);
  }

  // 优先处理直接命令（绕过 modeRouter，减少上下文消耗）
  let result = handleDirectRecord(userInput);

  // 如果不是直接命令，走 modeRouter
  if (!result) {
    result = routeCommand(userInput);
  }

  // 输出结果（JSON格式供Claude读取）
  const output = {
    status: result.handled ? (result.success ? 'success' : 'error') : 'ignored',
    command: userInput.trim().split(' ')[0],
    duration: Date.now() - startTime,
    ...result
  };

  console.log(JSON.stringify(output));

  process.exit(0);
}

main();
