#!/usr/bin/env node
/**
 * Jarvis Signal Hook - PostToolUse
 *
 * 轻量信号检测，分析最近对话，识别场景并生成信号文件
 * 执行时间目标: < 50ms
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  signalFile: path.join(__dirname, '..', '.pending_signal.json'),
  maxExchangeAge: 5 * 60 * 1000, // 5分钟有效期
  confidenceThreshold: 0.7
};

// 场景检测模式
const SCENE_PATTERNS = {
  learning: {
    patterns: [
      /记录单词|查单词|学习|英语|日语|shadowing|跟读|词汇|phrase|sentence/i,
      /\bword\b|\bvocabulary\b|\blearn\b|\benglish\b|\bjapanese\b/i
    ],
    keywords: ['单词', '词汇', '学习', '英语', '日语', 'shadowing', '跟读'],
    weight: 1.0
  },
  operation: {
    patterns: [
      /日报|数据|飞书|运营|报表|主播|业绩|直播|导出/i,
      /\breport\b|\bdashboard\b|\banalytics\b|\bmetrics\b/i
    ],
    keywords: ['日报', '数据', '飞书', '运营', '报表', '主播'],
    weight: 1.0
  },
  coding: {
    patterns: [
      /代码|编程|debug|bug|函数|API|实现|写|开发|脚本|python|javascript|java|cpp|rust/i,
      /\bcode\b|\bprogramming\b|\bfunction\b|\bdebug\b|\berror\b|\bscript\b/i
    ],
    keywords: ['代码', '编程', 'debug', '函数', 'API', '开发'],
    weight: 1.0
  },
  automation: {
    patterns: [
      /自动|脚本|定时|任务|批处理|批量|定时器|schedule/i,
      /\bautomation\b|\bschedule\b|\bcron\b|\bbatch\b|\btask\b/i
    ],
    keywords: ['自动', '脚本', '定时', '任务', '批处理'],
    weight: 0.9
  },
  assistant: {
    patterns: [
      // 任务管理相关
      /创建任务|新任务|开始任务|切换到.*任务|任务.*进展|归档任务|任务.*完成|task/i,
      // 动作/待办相关
      /要做|得做|记得|别忘了|待办|todo|搞定了|完成了|做完了|今天做什么|有哪些待办/i,
      // 习惯相关
      /昨晚.*睡|今天.*洗澡|习惯记录|睡眠记录|几点睡的/i,
      // 应用启动
      /打开|启动|运行.*软件|开.*程序/i,
      // 收藏/链接
      /找链接|添加收藏|收藏这个|搜索链接/i,
      // 通用助手
      /帮我|查一下|提醒|需要|请|帮忙|能|可以|怎么样|怎么弄/i,
      /\bhelp\b|\bassist\b|\bremind\b|\bcheck\b|\bfind\b|\bopen\b|\bstart\b/i
    ],
    keywords: [
      '任务', '待办', 'todo', '要做', '记得', '别忘了',
      '帮我', '查一下', '提醒', '打开', '启动',
      '搞定了', '完成了', '做完了', '今天做什么',
      '昨晚', '睡觉', '洗澡', '习惯',
      '链接', '收藏', '找一下'
    ],
    weight: 0.8 // 提高权重，作为主场景
  }
};

/**
 * 从 stdin 读取 PostToolUse hook 数据，提取可分析文本
 * stdin: {"tool_name":"...","tool_input":{...},"tool_response":{...},"transcript_path":"..."}
 */
function readLastExchange() {
  if (process.stdin.isTTY) return null;

  let raw = '';
  try {
    const buf = Buffer.alloc(4096);
    let n;
    while ((n = fs.readSync(0, buf, 0, buf.length, null)) > 0) {
      raw += buf.slice(0, n).toString('utf-8');
    }
  } catch (e) {
    return null;
  }

  if (!raw) return null;

  let hookData;
  try {
    hookData = JSON.parse(raw);
  } catch (e) {
    return null;
  }

  const parts = [];

  // 工具名
  if (hookData.tool_name) {
    parts.push(hookData.tool_name);
  }

  // 工具输入
  if (hookData.tool_input) {
    parts.push(JSON.stringify(hookData.tool_input).substring(0, 300));
  }

  // 工具输出
  if (hookData.tool_response) {
    const resp = hookData.tool_response;
    if (typeof resp === 'string') {
      parts.push(resp.substring(0, 300));
    } else if (resp.output) {
      parts.push(String(resp.output).substring(0, 300));
    } else if (resp.content) {
      const content = Array.isArray(resp.content)
        ? resp.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
        : String(resp.content);
      parts.push(content.substring(0, 300));
    }
  }

  // 从 transcript 读取最近的用户消息
  if (hookData.transcript_path) {
    try {
      const tp = hookData.transcript_path;
      if (fs.existsSync(tp)) {
        const stats = fs.statSync(tp);
        const readSize = Math.min(5120, stats.size);
        const fd = fs.openSync(tp, 'r');
        const tbuf = Buffer.alloc(readSize);
        fs.readSync(fd, tbuf, 0, readSize, stats.size - readSize);
        fs.closeSync(fd);
        const lines = tbuf.toString('utf-8').split('\n').filter(l => l.trim());
        for (const line of lines.reverse()) {
          try {
            const entry = JSON.parse(line);
            if (entry.role === 'user') {
              const userText = Array.isArray(entry.content)
                ? entry.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
                : String(entry.content || '');
              if (userText.length > 5) {
                parts.push(userText.substring(0, 200));
                break;
              }
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }

  if (parts.length === 0) return null;

  return {
    text: parts.join(' | '),
    source: 'stdin'
  };
}

/**
 * 分析文本，检测场景
 */
function detectScene(text) {
  const lowerText = text.toLowerCase();
  const results = [];

  for (const [sceneName, sceneConfig] of Object.entries(SCENE_PATTERNS)) {
    let matchCount = 0;
    let matchedKeywords = [];

    // 正则匹配
    for (const pattern of sceneConfig.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        matchCount += matches.length;
        matchedKeywords.push(...matches.slice(0, 3));
      }
    }

    // 关键词匹配
    for (const keyword of sceneConfig.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount += 0.5;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }

    // 计算置信度 (0-1)
    const confidence = Math.min(1.0, matchCount * 0.25 * sceneConfig.weight);

    if (confidence > 0.3) { // 最低阈值
      results.push({
        scene: sceneName,
        confidence,
        keywords: matchedKeywords.slice(0, 5),
        weight: sceneConfig.weight
      });
    }
  }

  // 按置信度排序
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

/**
 * 生成信号文件
 */
function writeSignal(signal) {
  try {
    const signalData = {
      ...signal,
      timestamp: Date.now(),
      isoTime: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG.signalFile, JSON.stringify(signalData, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to write signal:', e.message);
    return false;
  }
}

/**
 * 清理过期信号
 */
function cleanupExpiredSignals() {
  try {
    if (fs.existsSync(CONFIG.signalFile)) {
      const data = fs.readFileSync(CONFIG.signalFile, 'utf-8');
      const signal = JSON.parse(data);

      if (Date.now() - signal.timestamp > CONFIG.maxExchangeAge) {
        fs.unlinkSync(CONFIG.signalFile);
        return true;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return false;
}

/**
 * 主函数
 */
function main() {
  const startTime = Date.now();

  // 1. 清理过期信号
  cleanupExpiredSignals();

  // 2. 读取最近对话
  const exchange = readLastExchange();

  if (!exchange || !exchange.text) {
    process.exit(0);
  }

  // 3. 场景检测
  const text = exchange.text;
  const detectedScenes = detectScene(text);

  if (detectedScenes.length === 0) {
    process.exit(0);
  }

  // 4. 获取最佳匹配
  const bestMatch = detectedScenes[0];

  // 5. 置信度足够高时写入信号
  if (bestMatch.confidence >= CONFIG.confidenceThreshold) {
    const signal = {
      scene: bestMatch.scene,
      confidence: bestMatch.confidence,
      keywords: bestMatch.keywords,
      allMatches: detectedScenes.slice(0, 3),
      source: exchange.source || 'post-tool-use',
      triggerText: text.substring(0, 200) // 前200字符作为参考
    };

    const success = writeSignal(signal);

    const duration = Date.now() - startTime;

    if (success) {
      console.log(JSON.stringify({
        status: 'signal_generated',
        scene: bestMatch.scene,
        confidence: bestMatch.confidence.toFixed(2),
        duration: `${duration}ms`,
        file: CONFIG.signalFile
      }));
    }
  }

  process.exit(0);
}

// 运行
main();
