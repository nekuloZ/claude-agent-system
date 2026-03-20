#!/usr/bin/env node
/**
 * stop-hook.js - 关键节点检测
 *
 * 每次 Claude 回复完毕触发，分析这段对话是否有值得记录的内容。
 * 检测到关键节点 → exit 2 → Claude 询问用户是否记录
 * 没有关键节点  → exit 0 → 静默跳过
 */

const fs = require('fs');
const path = require('path');

const LAST_RECORD_FILE = path.join(__dirname, '..', '.last_record_ts.json');
const DEFAULT_LOOKBACK = 10; // 无记录时默认回看轮数

// ── 读 stdin（Stop hook 格式）──────────────────────────────────────
function readStdinSync() {
  if (process.stdin.isTTY) return null;
  try {
    let data = '';
    const buf = Buffer.alloc(4096);
    let n;
    while ((n = fs.readSync(0, buf, 0, buf.length, null)) > 0) {
      data += buf.slice(0, n).toString('utf-8');
    }
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// ── 读上次记录时间戳 ───────────────────────────────────────────────
function readLastRecordTs() {
  try {
    if (fs.existsSync(LAST_RECORD_FILE)) {
      const data = fs.readFileSync(LAST_RECORD_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) { /* ignore */ }
  return null;
}

// ── 解析 transcript，提取上次记录后的条目 ──────────────────────────
function parseTranscriptSince(transcriptPath, sinceTs) {
  const entries = [];
  try {
    if (!fs.existsSync(transcriptPath)) return entries;

    const stats = fs.statSync(transcriptPath);
    const readSize = Math.min(512000, stats.size);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, Math.max(0, stats.size - readSize));
    fs.closeSync(fd);

    const lines = buf.toString('utf-8').split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!sinceTs || (entry.timestamp && entry.timestamp > sinceTs)) {
          entries.push(entry);
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  // 无时间戳时取最后 DEFAULT_LOOKBACK 条
  return sinceTs ? entries : entries.slice(-DEFAULT_LOOKBACK * 4);
}

// ── 评分：判断内容是否值得记录 ─────────────────────────────────────
function scoreEntries(entries) {
  let score = 0;
  const signals = [];
  const toolNames = [];
  let claudeTextTotal = 0;
  let hasBashError = false;
  let hasBashSuccess = false;
  let webFetchCount = 0;

  for (const entry of entries) {
    // 统计工具调用
    if (entry.type === 'tool_use') {
      toolNames.push(entry.name);
      if (entry.name === 'Edit' || entry.name === 'Write') {
        score += 3;
        signals.push(`修改了文件: ${entry.input?.file_path?.split(/[\\/]/).pop() || ''}`);
      }
      if (entry.name === 'Bash') {
        score += 2;
        signals.push('执行了命令');
      }
      if (entry.name === 'WebFetch' || entry.name === 'WebSearch') {
        webFetchCount++;
      }
    }

    // 统计工具结果
    if (entry.type === 'tool_result') {
      const content = Array.isArray(entry.content)
        ? entry.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
        : String(entry.content || '');
      if (/error|Error|错误|failed|Failed/.test(content)) hasBashError = true;
      if (content.length > 20 && !hasBashError) hasBashSuccess = true;
    }

    // 统计 Claude 回复文本
    if (entry.role === 'assistant') {
      const text = Array.isArray(entry.content)
        ? entry.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
        : String(entry.content || '');
      claudeTextTotal += text.length;
      if (/总结|结论|建议|方案|综上|因此|所以/.test(text)) {
        score += 1;
        signals.push('包含总结性回复');
      }
    }
  }

  // 网络调研
  if (webFetchCount >= 2) {
    score += 2;
    signals.push(`进行了 ${webFetchCount} 次网络查询`);
  }

  // 尝试→修复经验
  if (hasBashError && hasBashSuccess) {
    score += 3;
    signals.push('有报错→修复的尝试经验');
  }

  // 长回复
  if (claudeTextTotal > 800) {
    score += 1;
    signals.push('有大量分析内容');
  }

  return { score, signals };
}

// ── 检测 Claude 上一句是否已在问记录 ──────────────────────────────
function lastResponseAsksToRecord(entries) {
  const assistantEntries = entries.filter(e => e.role === 'assistant');
  if (assistantEntries.length === 0) return false;
  const last = assistantEntries[assistantEntries.length - 1];
  const text = Array.isArray(last.content)
    ? last.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
    : String(last.content || '');
  return /要记录吗|需要记录|记录一下吗/.test(text);
}

// ── 主函数 ─────────────────────────────────────────────────────────
function main() {
  const hookData = readStdinSync();

  // 防死循环
  if (hookData?.stop_hook_active) process.exit(0);

  const transcriptPath = hookData?.transcript_path;
  if (!transcriptPath) process.exit(0);

  const lastRecord = readLastRecordTs();
  const sinceTs = lastRecord?.timestamp || null;

  const entries = parseTranscriptSince(transcriptPath, sinceTs);
  if (entries.length === 0) process.exit(0);

  // 防重复触发
  if (lastResponseAsksToRecord(entries)) process.exit(0);

  const { score, signals } = scoreEntries(entries);

  if (score >= 4) {
    const desc = signals.slice(0, 2).join('、');
    process.stderr.write(
      `[关键节点] 检测到：${desc}，请问用户："这次要记录吗？"`
    );
    process.exit(2);
  }

  process.exit(0);
}

main();
