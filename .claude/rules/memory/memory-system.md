# memory-system.md - L0-L3 Memory Architecture Rules

> **Rule Level:** L1 Core System
> **Last Updated:** 2026-03-18
> **Applies to:** All Modes

---

## 🏗️ Four-Layer Architecture

```
L3_User/        L2_Procedural/   L1_Episodic/     L0_Working/
(用户层)         (AI程序知识)      (长期记忆)        (工作层)
    ↑               ↑               ↑               ↑
    └───────────────┴───────────────┴───────────────┘
                    渐进式加载
```

### Layer Definitions

| Layer | Name | Content | TTL | Access Frequency |
|-------|------|---------|-----|------------------|
| **L0** | Working | Scratchpad, Kanban, Habits | Hours | Every session |
| **L1** | Episodic | Daily logs, Projects, Weekly | Days-Months | Weekly |
| **L2** | Procedural | Skills, Protocols, Patterns | Months | On need |
| **L3** | User | Identity, Themes, Learning | Permanent | Rare |

---

## 📝 L0 - Working Memory

**Path:** `记忆库/L0_工作区/`

### Must-Load Files (Session Start)
- `scratchpad.md` - Current day notes
- `next_actions_kanban.md` - Action board
- `habit_data.json` - Habit tracking
- `.current_task.json` - Active tasks

### Update Rules
- **Write:** UTF-8 encoding, obsidian-markdown skill
- **Read:** On-demand, no preloading
- **Clear:** Weekly archive clears scratchpad

---

## 📚 L1 - Episodic Memory

**Path:** `记忆库/L1_长期记忆/`

### Structure
```
01-Daily/           # Daily logs
├── YYYY-MM-DD.md
└── .data/YYYY-MM-DD.json

02-Projects/        # Project tracking
├── {{project}}.md
└── {{project}}/
    └── tasks/

03-Relationships/   # People tracking
└── {{person}}.md

Weekly_Logs/        # Weekly summaries
└── YYYY-Www.md

insight_index.json  # Pattern tracking
```

### Archive Rules
- **Daily:** "复盘" or "Archive" → `01-Daily/YYYY-MM-DD.md`
- **Weekly:** "周归档" or "WeeklyArchive" → `Weekly_Logs/YYYY-Www.md`
- **Scratchpad:** Cleared on weekly, appended on daily

---

## 🔧 L2 - Procedural Memory

**Path:** `记忆库/L2_知识库/`

### Content
- Skill definitions (now in `.claude/skills/`)
- Protocol documentation
- Reference materials
- Thinking frameworks

### Usage
- Read when developing new skills
- Reference for complex procedures
- Not auto-loaded

---

## 👤 L3 - User Memory

**Path:** `记忆库/L3_用户档案/`

### Structure
```
01-Identity/        # User self-definition
├── identity.md
├── values.md
└── goals.md

02-Themes/          # Recurring patterns
├── {{theme}}.md
└── index.md

03-Learning/        # Skill acquisition
├── Language/
│   ├── en/
│   └── jp/
└── Skills/
```

### Update Rules
- User-editable (AI should not auto-modify)
- Read for personalization context
- Long-term accumulation

---

## 🔄 Progressive Loading Strategy

### Stage 0: L0 Must-Load (~50ms)
```
scratchpad.md + kanban + habit_data
```

### Stage 1: Intent Recognition
```
Extract keywords: project names, people, dates, topics
```

### Stage 2: Mention Layer Preload (~200ms)
```
- Path matching: 02-Projects/, 03-Relationships/, 01-Daily/
- Wikilink preload: Extract [[links]] and load related notes
```

### Stage 3: Semantic Search (~1.2s)
```
- Trigger: Quality insufficient from Stage 2
- Method: Gemini Embedding vector search
- Return: P2 background context
```

---

## 🔍 Memory Retrieval

### Query Types

| Query Pattern | Action |
|--------------|--------|
| "今天做了什么？" | Read `L0_Working/scratchpad.md` |
| "项目 X 进展？" | Read `L1_Episodic/02-Projects/X.md` |
| "之前说过..." | Semantic search + keyword search |
| "应该做什么？" | Read `next_actions_kanban.md` |

### RAG Integration
- **Source:** Daily logs, scratchpad, projects, themes
- **Embedding:** Gemini 2
- **Storage:** Supabase vector DB
- **Sync:** Automatic on daily archive

---

## 📊 Insight Index

**File:** `L1_Episodic/insight_index.json`

### Rules
- Count ≥ 3: Keep pattern
- > 30 days no occurrence: Remove
- Max 50 entries

### Tracked Patterns
- Problems (recurring issues)
- Behaviors (habits, reactions)
- Emotions (mood patterns)
- Worries (anxiety sources)
- Preferences (likes/dislikes)

---

## ⚡ Quick Reference

| Need | File |
|------|------|
| Today's notes | `L0_Working/scratchpad.md` |
| Action items | `L0_Working/next_actions_kanban.md` |
| Habit status | `L0_Working/habit_data.json` |
| Project status | `L1_Episodic/02-Projects/{name}.md` |
| Daily history | `L1_Episodic/01-Daily/YYYY-MM-DD.md` |
| Weekly summary | `L1_Episodic/Weekly_Logs/YYYY-Www.md` |
| User identity | `L3_User/01-Identity/` |
| Learning data | `L3_User/03-Learning/` |

---

> **Related:** [05-modes.md](../modes/05-modes.md) | [05-skills.md](../common/05-skills.md)
