---
name: scene-router
description: Jarvis 智能场景路由系统 - 5场景自动触发与上下文预加载
version: v1.0
last_updated: 2026-03-18
---

# 场景路由系统

Jarvis 智能触发架构的核心组件，负责场景检测、信号路由和上下文预加载。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Signal Hook (PostToolUse)                          │
│ 文件: .claude/hooks/post-tool-use.js                        │
│ 职责: 轻量信号检测，分析最近3轮对话                           │
│ 输出: .claude/.pending_signal.json                          │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Scene Router (本 Skill)                            │
│ 文件: .claude/skills/scene-router/router.js                 │
│ 职责: 5场景映射，决定预加载哪些记忆片段                       │
│ 场景: learning, operation, assistant, coding, automation    │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Skill Execution                                    │
│ 复用: memory_loader 渐进加载机制                            │
│ 新增: 场景感知的预加载策略                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5 个场景定义

| 场景 | 名称 | 关联 Skills | 置信度阈值 | 优先级 |
|------|------|------------|-----------|--------|
| `learning` | 学习场景 | vocabulary_manager, short_sentence_trainer, shadowing_manager | 0.7 | P1 |
| `operation` | 运营场景 | daily_report, feishu_export, report_insight | 0.8 | P1 |
| `coding` | 代码编程 | (无，通用处理) | 0.7 | P0 |
| `automation` | 自动化任务 | (无，通用处理) | 0.75 | P2 |
| `assistant` | 助手场景 | app_launcher, habit_tracker, favorites_manager | 0.6 | P3 |

---

## 使用方式

### 命令行工具

```bash
# 检查当前信号
node .claude/skills/scene-router/router.js check

# 检查特定场景匹配
node .claude/skills/scene-router/router.js check learning

# 执行场景预加载
node .claude/skills/scene-router/router.js preload learning

# 清理信号文件
node .claude/skills/scene-router/router.js clear

# 列出所有场景
node .claude/skills/scene-router/router.js list
```

### 在 Skill 中调用

```javascript
const router = require('../scene-router/router.js');

// 读取信号
const signal = router.readSignal();

// 检查场景匹配
const match = router.matchSignalToScene('learning');
if (match.matched) {
    // 执行预加载
    const result = router.executePreload('learning');
}
```

---

## 信号文件格式

**文件位置**: `.claude/.pending_signal.json`

**有效期**: 5分钟

```json
{
  "scene": "learning",
  "confidence": 0.85,
  "keywords": ["单词", "英语"],
  "allMatches": [
    { "scene": "learning", "confidence": 0.85, "keywords": [...] },
    { "scene": "assistant", "confidence": 0.45, "keywords": [...] }
  ],
  "timestamp": 1710758400000,
  "isoTime": "2026-03-18T10:00:00.000Z",
  "source": "post-tool-use",
  "triggerText": "记录单词..."
}
```

---

## 上下文预加载策略

每个场景配置了不同的预加载路径：

### learning 场景
- L0: `scratchpad.md`
- L3: `L3_User/03-Learning/Language/`
- L3: `L3_Semantic/language/`

### operation 场景
- L0: `scratchpad.md`
- `记忆库/data/`
- `记忆库/L0_工作区/reports/`

### coding 场景
- L0: `scratchpad.md`
- `.claude/.active_project.json`
- `projects/`

---

## Hook 配置

**文件**: `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "node .claude/hooks/post-tool-use.js"
      }
    ]
  }
}
```

---

## 性能约束

| 层级 | 目标耗时 | 约束 |
|------|---------|------|
| Layer 1 (Signal Hook) | < 50ms | 正则匹配，不调用 AI |
| Layer 2 (Scene Router) | < 200ms | 只加载元数据，不加载内容 |
| Layer 3 (Skill Execution) | < 1s | 渐进加载，控制上下文 < 30% |

---

## 扩展新场景

1. 在 `config.json` 中添加新场景配置
2. 在 `post-tool-use.js` 中添加检测模式
3. 在对应 Skill 中添加自动触发检测逻辑

---

## 相关文档

- `config.json` - 场景配置
- `router.js` - 路由逻辑
- `../hooks/post-tool-use.js` - 信号检测 Hook
