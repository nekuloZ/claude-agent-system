# 05-modes.md - Mode System v2.0 Rules

> **Rule Level:** L2 Standard
> **Last Updated:** 2026-03-18
> **Applies to:** All Modes

---

## 🎮 Mode System Overview

Jarvis operates in 5 game-like modes, each with specialized skills and context budgets.

### Mode Switching

| Command | Mode | Emoji | Context Budget |
|---------|------|-------|----------------|
| `/assist` | Assistant | 🤖 | 30% |
| `/dev` | Developer | 🔧 | 40% |
| `/learn` | Learning | 📚 | 30% |
| `/ops` | Operations | 📊 | 35% |
| `/auto` | Automation | ⚡ | 35% |

**Default Mode:** `assist`

---

## 🔄 Mode Switching Rules

### When to Switch
- User explicitly inputs slash command: `/mode_name`
- Task type clearly belongs to another mode
- Context budget exceeded, need lighter mode

### Auto-Detection (Scene Router)
| User Input | Suggested Mode |
|------------|----------------|
| "写代码", "修复bug", "优化性能" | dev |
| "记录单词", "练句子", "跟读" | learn |
| "生成日报", "分析数据", "导出飞书" | ops |
| "创建任务", "复盘今天", "打开XX" | assist |
| "写脚本", "批量处理", "自动化" | auto |

### Mode Switching Flow
```
1. Parse slash command
2. Load mode config from modes.json
3. Update .active_mode.json
4. Preload mode-specific context
5. Display mode switch confirmation
```

---

## 💡 Mode-Specific Quick Commands

### Dev Mode Commands
- `/plan [description]` - Create implementation plan
- `/review` - Request code review
- `/test` - Run TDD workflow

### Learn Mode Commands
- `/word [word]` - Record vocabulary
- "帮我练句子" - Short sentence training

### Ops Mode Commands
- `/report` - Generate daily report
- "导出飞书表格" - Feishu export

### Assist Mode Commands
- `/task [name]` - Create task
- `/todo [action]` - Add to-do
- `/archive` - Daily review
- `/weekly` - Weekly archive
- `/munger` - Mental model review

---

## 📊 Context Budget Management

### Budget Allocation
| Mode | Budget | Rationale |
|------|--------|-----------|
| dev | 40% | Code needs more context |
| learn | 30% | Learning is lightweight |
| ops | 35% | Data processing moderate |
| assist | 30% | Daily tasks lightweight |
| auto | 35% | Scripting moderate |

### Compression Triggers
| Usage | Action |
|-------|--------|
| > 70% | Warning: Consider compression |
| > 85% | Critical: Recommend compression |
| > 95% | Emergency: Auto-compress |

---

## 🎯 Mode-Specific Behaviors

### 🤖 Assist Mode (Default)
- Focus: Task management, memory, daily operations
- Tone: Helpful assistant, proactive but not intrusive
- Skills: 11 local skills for productivity

### 🔧 Dev Mode
- Focus: Code writing, architecture, debugging
- Tone: Technical collaborator, detail-oriented
- Skills: 9 global dev skills + mode-specific rules

### 📚 Learn Mode
- Focus: Language learning, skill acquisition
- Tone: Patient tutor, encouraging
- Skills: 4 learning skills + vocabulary tracking

### 📊 Ops Mode
- Focus: Data analysis, reporting, automation
- Tone: Data-driven, precise
- Skills: 6 ops skills + Supabase integration

### ⚡ Auto Mode
- Focus: Scripting, batch processing, tool development
- Tone: Efficient, reliability-focused
- Skills: 5 automation skills

---

## 📁 Preload Paths by Mode

### Dev Mode
```
- projects/
- .claude/skills/
- .claude/.active_project.json
```

### Learn Mode
```
- 记忆库/L3_用户档案/03-Learning/
- 记忆库/html-tools/language-learning/
```

### Ops Mode
```
- 记忆库/data/
- 记忆库/L0_工作区/reports/
- .claude/skills/daily_report/
```

### Assist Mode
```
- 记忆库/L0_工作区/
- tasks/
- .claude/.active_project.json
```

### Auto Mode
```
- scripts/
- tools/
- core/
```

---

## ⚙️ Configuration Files

### modes.json
Path: `.claude/mode-system/modes.json`
- Mode definitions
- Skill assignments
- Slash command mappings
- Context budgets

### .active_mode.json
Path: `.claude/.active_mode.json`
```json
{
  "mode": "assist",
  "since": 1234567890,
  "previousMode": "dev",
  "switchCount": 7,
  "contextBudget": 30
}
```

### settings.json
Path: `.claude/settings.json`
```json
{
  "mode_system": {
    "enabled": true,
    "version": "2.0",
    "default_mode": "assist"
  }
}
```

---

## 🔧 Mode Router CLI

```bash
# Check current mode
node .claude/mode-system/router.js status

# Switch mode
node .claude/mode-system/router.js switch dev

# List all modes
node .claude/mode-system/router.js list

# Show help
node .claude/mode-system/router.js help
```

---

> **Related:** [dev-mode.md](./dev-mode.md) | [learn-mode.md](./learn-mode.md) | [ops-mode.md](./ops-mode.md) | [assist-mode.md](./assist-mode.md) | [auto-mode.md](./auto-mode.md)
