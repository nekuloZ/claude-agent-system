# 05-skills.md - Skill System Rules

> **Rule Level:** L2 Standard
> **Last Updated:** 2026-03-18
> **Applies to:** All Modes

---

## 🎯 Skill Priority Rules

### P0 - Highest Priority (Must Trigger)

| Skill | Trigger | Mode |
|-------|---------|------|
| task_completion | "完成了", "搞定了", "做完了" | assist |
| progress_tracker | "开始搞", "先这样", 对话结束 | assist |
| mode-switcher | "/dev", "/learn", "/ops", "/assist", "/auto" | all |

### P1 - High Priority

| Skill | Trigger | Mode |
|-------|---------|------|
| habit_tracker | "昨晚X点睡", "今天洗澡了" | assist |
| memory_loader | "我之前", "上次", session start | all |
| project_manager | "创建项目", "进入项目" | assist |
| task_manager | "创建任务", "开始任务" | assist |

### P2 - Contextual

| Skill | Trigger | Mode |
|-------|---------|------|
| action_manager | "要做", "得做", "记得" | assist |
| daily_review_archiver | "复盘", "Archive" | assist |
| weekly_review_archiver | "周归档", "WeeklyArchive" | assist |

### P3 - Fallback

| Skill | Trigger | Mode |
|-------|---------|------|
| record | Any significant action | all |

---

## 🔧 Skill Development Standards

### File Structure
```
.claude/skills/{skill_name}/
├── Skill.md          # Core instructions
└── CHANGELOG.json    # Version history
```

### Skill.md Frontmatter
```yaml
---
name: skill-name
description: Use when ...
version: v1.0
last_updated: 2026-03-18
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist / 📚 learn / 📊 ops / 🔧 dev / ⚡ auto
```

### Mode Assignment Rules

| Mode | Skill Types |
|------|-------------|
| assist | Task management, memory, habits, daily operations |
| learn | Vocabulary, shadowing, sentence training, TTS |
| ops | Daily reports, data export, insights, video analysis |
| dev | Planning, coding, debugging, code review (global) |
| auto | Skill dev, hook dev, scripting, game trainers |

---

## ⚡ Auto-Trigger Detection

### Session Start
```
ALWAYS trigger: session_startup, memory_loader, mode-switcher check
```

### Task Signals
```
"完成了" → task_completion → record
"开始搞" → progress_tracker (start)
"先这样" → progress_tracker (pause)
"要做" → action_manager
```

### Habit Signals
```
"昨晚X点睡" → habit_tracker
"今天洗澡了" → habit_tracker
```

### Mode Signals
```
"/dev" → mode-switcher → dev mode
"/learn" → mode-switcher → learn mode
```

---

## 📋 Skill Call Standards

### When to Use Skill Tool

| Scenario | Action |
|----------|--------|
| User explicitly requests skill | `Skill:skill_name` |
| Trigger word detected | `Skill:skill_name` |
| Multiple independent tasks | Use multiple skills or parallel agents |

### Skill Parameters
```json
{
  "skill": "skill-name",
  "args": "optional arguments"
}
```

---

## 🔄 Skill Lifecycle

### Creation
1. Create `skills/{name}/Skill.md`
2. Add frontmatter with mode归属
3. Create `CHANGELOG.json`
4. Update modes.json if mode-specific
5. Test trigger words

### Update
1. Update Skill.md content
2. Increment version in frontmatter
3. Add entry to CHANGELOG.json
4. Update related files if breaking change

### Deprecation
1. Mark in CHANGELOG.json: "deprecated in vX.X"
2. Move to `{name}.disabled/` or delete
3. Update all references
4. Document migration path

---

## 🎯 Mode-Specific Skill Lists

### 🤖 Assist Mode (11 skills)
- task_manager, action_manager, habit_tracker
- app_launcher, favorites_manager, progress_tracker
- record, task_completion, daily_review_archiver
- weekly_review_archiver, munger_observer

### 📚 Learn Mode (4 skills)
- vocabulary_manager, shadowing_manager
- short_sentence_trainer, tts_reader

### 📊 Ops Mode (6 skills)
- daily_report, feishu_export, report_insight
- video_analyzer, poster_editor, xlsx

### 🔧 Dev Mode (9 global skills)
- planning-with-files, executing-plans
- requesting-code-review, receiving-code-review
- systematic-debugging, test-driven-development
- frontend-design, finishing-a-development-branch
- using-git-worktrees

### ⚡ Auto Mode (5 skills)
- skill-development, hook-development
- planning-with-files, game_trainer_search
- rtsc_manager

---

> **Related:** [05-modes.md](../modes/05-modes.md) | Skill files in `.claude/skills/`
