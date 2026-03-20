#!/usr/bin/env node
/**
 * update-last-record.js
 * 更新上次记录时间戳，供 stop-hook 和 command-parser 确定分析边界
 * 用法：node .claude/hooks/update-last-record.js "摘要关键词"
 */

const fs = require('fs');
const path = require('path');

const LAST_RECORD_FILE = path.join(__dirname, '..', '.last_record_ts.json');

const summary = process.argv[2] || '';
const data = {
  timestamp: Date.now(),
  isoTime: new Date().toISOString(),
  summary
};

try {
  fs.writeFileSync(LAST_RECORD_FILE, JSON.stringify(data, null, 2));
} catch (e) {
  // 静默失败，不影响主流程
}
