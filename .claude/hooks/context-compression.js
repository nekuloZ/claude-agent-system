#!/usr/bin/env node
/**
 * StrategicCompression Hook - Jarvis 上下文压缩钩子
 *
 * 触发时机: PreToolUse / 手动触发 / 上下文阈值检测
 * 职责: 分析上下文使用情况 → 生成压缩建议 → 执行压缩策略
 *
 * @version 1.0
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const CONFIG = {
  modeConfigPath: path.join(__dirname, '..', 'mode-system', 'modes.json'),
  suggestionsPath: path.join(__dirname, '..', '.compression_suggestions.json'),
  activeModePath: path.join(__dirname, '..', '.active_mode.json'),
  maxTokens: 200000,
  warningThreshold: 0.7,
  criticalThreshold: 0.85,
  emergencyThreshold: 0.95
};

// 压缩策略定义
const COMPRESSION_STRATEGIES = {
  summary: {
    id: 'summary',
    name: '摘要压缩',
    emoji: '📝',
    description: '将详细执行记录转为摘要',
    condition: '有长段执行记录或调试过程',
    action: '保留结果，压缩过程描述',
    example: '详细调试过程 → "已修复：xxx问题"',
    priority: 1
  },
  archive: {
    id: 'archive',
    name: '归档压缩',
    emoji: '📦',
    description: '将已完成内容移至文件',
    condition: '有已完成的规划/设计内容',
    action: '写入文件，上下文只保留引用',
    example: '详细设计文档 → "见 design.md"',
    priority: 2
  },
  skill_offload: {
    id: 'skill_offload',
    name: '技能卸载',
    emoji: '🎯',
    description: '使用 Skill 替代详细指令',
    condition: '重复性任务模式',
    action: '创建/调用 Skill，卸载详细流程',
    example: '详细测试步骤 → "使用 /test 命令"',
    priority: 3
  },
  subagent_offload: {
    id: 'subagent_offload',
    name: '分层卸载',
    emoji: '🔀',
    description: '使用子代理处理复杂任务',
    condition: '复杂多步骤任务',
    action: '委托子代理，主对话只保留决策点',
    example: '完整实现过程 → 子代理执行，主代理审核',
    priority: 4
  }
};

/**
 * 加载模式配置
 */
function loadModeConfig() {
  try {
    const data = fs.readFileSync(CONFIG.modeConfigPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * 加载当前模式
 */
function loadActiveMode() {
  try {
    if (fs.existsSync(CONFIG.activeModePath)) {
      const data = fs.readFileSync(CONFIG.activeModePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    // 忽略错误
  }
  return { mode: 'assist', since: Date.now() };
}

/**
 * 估算 token 数量（简化算法）
 */
function estimateTokens(text) {
  if (!text) return 0;
  // 中文字符约1.5 token，英文单词约1 token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.2 + otherChars * 0.3);
}

/**
 * 分析上下文使用情况
 */
function analyzeContext(transcript) {
  const estimatedTokens = estimateTokens(transcript);
  const usage = estimatedTokens / CONFIG.maxTokens;

  let level = 'normal';
  if (usage >= CONFIG.emergencyThreshold) {
    level = 'emergency';
  } else if (usage >= CONFIG.criticalThreshold) {
    level = 'critical';
  } else if (usage >= CONFIG.warningThreshold) {
    level = 'warning';
  }

  return {
    level,
    usage: Math.round(usage * 100),
    estimatedTokens,
    remainingTokens: CONFIG.maxTokens - estimatedTokens,
    thresholds: {
      warning: Math.round(CONFIG.warningThreshold * 100),
      critical: Math.round(CONFIG.criticalThreshold * 100),
      emergency: Math.round(CONFIG.emergencyThreshold * 100)
    }
  };
}

/**
 * 检测可压缩内容模式
 */
function detectCompressiblePatterns(transcript) {
  const patterns = [];

  // 检测详细执行记录
  if (/(详细执行|步骤|过程|调试).*?[\n\r]{2,}/s.test(transcript) &&
      transcript.length > 3000) {
    patterns.push({
      strategy: 'summary',
      description: '发现长段执行记录，建议转为摘要',
      confidence: 0.8
    });
  }

  // 检测设计文档内容
  if (/##\s*(设计|规划|架构|方案)[\s\S]{1000,}?##\s*(实现|代码)/i.test(transcript)) {
    patterns.push({
      strategy: 'archive',
      description: '设计文档占用较多空间，建议归档到文件',
      confidence: 0.75
    });
  }

  // 检测重复性步骤
  const stepPattern = /步骤\s*\d+[\s\S]*?步骤\s*\d+[\s\S]*?步骤\s*\d+/i;
  if (stepPattern.test(transcript)) {
    patterns.push({
      strategy: 'skill_offload',
      description: '发现重复性步骤模式，建议创建 Skill',
      confidence: 0.7
    });
  }

  // 检测复杂多步骤任务
  if (transcript.length > 5000 &&
      (transcript.match(/function|def|class/g) || []).length > 5) {
    patterns.push({
      strategy: 'subagent_offload',
      description: '复杂实现代码较多，建议使用子代理',
      confidence: 0.65
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 生成压缩建议
 */
function generateCompressionSuggestions(contextInfo, patterns, modeConfig) {
  const suggestions = [];
  const contextBudget = modeConfig?.context_budget || 30;

  // 基于级别的强制建议
  if (contextInfo.level === 'emergency') {
    suggestions.push({
      type: 'urgent',
      message: '上下文即将耗尽！建议立即执行压缩',
      actions: ['summary', 'archive']
    });
  } else if (contextInfo.level === 'critical') {
    suggestions.push({
      type: 'warning',
      message: '上下文严重不足，建议压缩',
      actions: ['summary']
    });
  }

  // 基于模式的建议
  for (const pattern of patterns.slice(0, 2)) {
    const strategy = COMPRESSION_STRATEGIES[pattern.strategy];
    if (strategy) {
      suggestions.push({
        type: 'pattern',
        strategy: strategy.id,
        name: strategy.name,
        emoji: strategy.emoji,
        description: pattern.description,
        action: strategy.action,
        example: strategy.example,
        confidence: pattern.confidence
      });
    }
  }

  // 基于模式的预算建议
  if (contextInfo.usage > contextBudget) {
    suggestions.push({
      type: 'budget',
      message: `当前使用 ${contextInfo.usage}% 超过 ${modeConfig?.name || '当前模式'} 预算 (${contextBudget}%)`,
      recommendedAction: '考虑切换到轻量级模式或执行压缩'
    });
  }

  return suggestions;
}

/**
 * 写入建议文件
 */
function writeSuggestions(data) {
  try {
    fs.writeFileSync(CONFIG.suggestionsPath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to write suggestions:', e.message);
    return false;
  }
}

/**
 * 读取压缩建议
 */
function readSuggestions() {
  try {
    if (fs.existsSync(CONFIG.suggestionsPath)) {
      const data = fs.readFileSync(CONFIG.suggestionsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    // 忽略错误
  }
  return null;
}

/**
 * 清理建议文件
 */
function clearSuggestions() {
  try {
    if (fs.existsSync(CONFIG.suggestionsPath)) {
      fs.unlinkSync(CONFIG.suggestionsPath);
      return true;
    }
  } catch (e) {
    // 忽略错误
  }
  return false;
}

/**
 * 格式化状态报告
 */
function formatStatusReport(contextInfo, activeMode, suggestions) {
  const modeConfig = loadModeConfig()?.modes?.[activeMode.mode] || {};
  const emoji = modeConfig.emoji || '🤖';

  let report = `
╔══════════════════════════════════════════════════════════╗
║           📊 Jarvis 上下文状态报告                         ║
╠══════════════════════════════════════════════════════════╣
║ 当前模式: ${emoji} ${modeConfig.name || activeMode.mode}                                ║
║ 使用占比: ${contextInfo.usage}% / ${modeConfig.context_budget || 30}% (模式预算)                     ║
║ 预估Token: ${contextInfo.estimatedTokens.toLocaleString()} / ${CONFIG.maxTokens.toLocaleString()}                ║
║ 剩余空间: ${contextInfo.remainingTokens.toLocaleString()}                               ║
║ 状态级别: ${contextInfo.level.toUpperCase()}${' '.repeat(45 - contextInfo.level.length)}║
`;

  if (suggestions && suggestions.length > 0) {
    report += `╠══════════════════════════════════════════════════════════╣\n`;
    report += `║ 💡 压缩建议:                                              ║\n`;
    for (const s of suggestions.slice(0, 3)) {
      if (s.type === 'pattern') {
        report += `║    ${s.emoji} ${s.name}: ${s.description.substring(0, 35)}${s.description.length > 35 ? '...' : ''}${' '.repeat(Math.max(0, 50 - s.description.length))}║\n`;
      }
    }
  }

  report += `╚══════════════════════════════════════════════════════════╝\n`;

  return report;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  switch (command) {
    case 'check': {
      // 从 stdin 读取 hook 数据（SessionStart: {"session_id":"...","transcript_path":"..."}）
      let transcript = '';

      if (!process.stdin.isTTY) {
        try {
          let raw = '';
          const ibuf = Buffer.alloc(4096);
          let n;
          while ((n = fs.readSync(0, ibuf, 0, ibuf.length, null)) > 0) {
            raw += ibuf.slice(0, n).toString('utf-8');
          }
          if (raw) {
            const hookData = JSON.parse(raw);
            // 读取 transcript 文件（最多 500KB 用于估算）
            if (hookData.transcript_path && fs.existsSync(hookData.transcript_path)) {
              const stats = fs.statSync(hookData.transcript_path);
              if (stats.size > 0) {
                const readSize = Math.min(512000, stats.size);
                const tfd = fs.openSync(hookData.transcript_path, 'r');
                const tbuf = Buffer.alloc(readSize);
                fs.readSync(tfd, tbuf, 0, readSize, 0);
                fs.closeSync(tfd);
                transcript = tbuf.toString('utf-8');
              }
            }
          }
        } catch (e) {
          // 忽略
        }
      }

      const contextInfo = analyzeContext(transcript);
      const patterns = detectCompressiblePatterns(transcript);
      const modeConfig = loadModeConfig();
      const activeMode = loadActiveMode();
      const currentModeConfig = modeConfig?.modes?.[activeMode.mode];

      const suggestions = generateCompressionSuggestions(
        contextInfo,
        patterns,
        currentModeConfig
      );

      // 如果超过阈值，写入建议
      if (contextInfo.level !== 'normal' || suggestions.length > 0) {
        const data = {
          timestamp: Date.now(),
          isoTime: new Date().toISOString(),
          contextInfo,
          activeMode: activeMode.mode,
          suggestions,
          autoCompress: contextInfo.level === 'emergency'
        };
        writeSuggestions(data);
      }

      // 输出状态
      const status = {
        status: contextInfo.level === 'normal' ? 'ok' : 'compression_needed',
        level: contextInfo.level,
        usage: `${contextInfo.usage}%`,
        mode: activeMode.mode,
        suggestions: suggestions.length,
        shouldCompress: contextInfo.level !== 'normal'
      };

      console.log(JSON.stringify(status, null, 2));

      // 如果verbose模式，输出详细报告
      if (args.includes('--verbose')) {
        console.log(formatStatusReport(contextInfo, activeMode, suggestions));
      }

      break;
    }

    case 'status':
    case 'show': {
      const suggestions = readSuggestions();
      if (suggestions) {
        console.log(JSON.stringify(suggestions, null, 2));
      } else {
        console.log(JSON.stringify({ status: 'no_suggestions' }));
      }
      break;
    }

    case 'clear': {
      const cleared = clearSuggestions();
      console.log(JSON.stringify({ cleared }));
      break;
    }

    case 'strategies': {
      console.log(JSON.stringify(COMPRESSION_STRATEGIES, null, 2));
      break;
    }

    case 'help':
    default: {
      console.log(`
StrategicCompression Hook - Jarvis 上下文压缩钩子

Usage:
  node context-compression.js check [--verbose]  检查上下文状态
  node context-compression.js status             显示当前建议
  node context-compression.js clear              清理建议文件
  node context-compression.js strategies         显示压缩策略
  node context-compression.js help               显示帮助

环境变量:
  CLAUDE_TRANSCRIPT    当前对话记录

配置文件:
  - .claude/mode-system/modes.json    模式配置
  - .claude/.active_mode.json         当前模式
  - .claude/.compression_suggestions.json  压缩建议
`);
    }
  }
}

// 导出模块
module.exports = {
  analyzeContext,
  detectCompressiblePatterns,
  generateCompressionSuggestions,
  COMPRESSION_STRATEGIES,
  estimateTokens
};

// CLI 执行
if (require.main === module) {
  main();
}
