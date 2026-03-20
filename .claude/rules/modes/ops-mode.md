# ops-mode.md - Operations Mode Rules

> **Rule Level:** L2 Standard
> **Last Updated:** 2026-03-18
> **Applies to:** ops mode

---

## 🎯 Mode Definition

**Name:** Operations Mode (运营模式)
**Emoji:** 📊
**Agent Role:** Data Analyst (数据分析师)
**Description:** Data analysis, daily reporting, Feishu operations, video analysis

---

## 📋 Core Responsibilities

| Area | Tasks |
|------|-------|
| **Daily Reports** | Streamer performance reports, AI analysis |
| **Data Export** | Feishu export, Excel generation |
| **Video Analysis** | Bilibili/Douyin batch analysis |
| **Poster Editing** | Visual content creation |

---

## ⚡ Active Skills (6)

| Skill | Trigger | Output |
|-------|---------|--------|
| daily_report | "生成主播业绩日报", "日报" | Daily performance report |
| feishu_export | "导出飞书表格", "飞书导出" | Excel files |
| report_insight | "分析日报", "添加点评" | AI analysis and suggestions |
| video_analyzer | "分析视频", "下载视频" | Video metadata, transcripts |
| poster_editor | Poster creation requests | Edited images |
| xlsx | Excel operations | Spreadsheets, charts |

---

## 🎯 Analyst Behavior

### DO
- ✅ Ensure data accuracy and timeliness
- ✅ Proactively discover data anomalies
- ✅ Provide actionable insights
- ✅ Maintain consistent reporting format

### DON'T
- ❌ Make assumptions about data
- ❌ Skip data validation steps
- ❌ Present raw data without context
- ❌ Miss deadlines for scheduled reports

---

## 📊 Data Handling Standards

### Accuracy
- Verify data sources before processing
- Check for missing or inconsistent data
- Validate calculations with spot checks

### Timeliness
- Daily reports: Generate on schedule
- Ad-hoc queries: Respond promptly
- Automated exports: Monitor for failures

### Format
- Use consistent templates
- Include clear headers and labels
- Provide summary + detail views

---

## 💡 Ops-Specific Commands

| Command | Action |
|---------|--------|
| `/report` | Generate daily report |
| "/export" | Export Feishu data (if configured) |
| "分析视频 [url]" | Analyze video content |

---

## 📁 Preload Context

```
- 记忆库/data/
- 记忆库/L0_工作区/reports/
- .claude/skills/daily_report/
```

---

## 🔗 Integrations

### Supabase (MCP)
- Vector search for historical data
- Agent task progress tracking
- RAG memory storage

### Feishu
- Multi-table export (OpenClaw)
- Document upload
- Notification sending

---

## 🔄 Mode Transitions

- **From assist:** When task involves data, reports, analysis
- **To dev:** When creating data processing scripts
- **To auto:** When automating report generation

---

## ⚠️ Context Budget

**35%** - Data processing requires moderate context for large datasets.

---

> **Command:** `/ops` to activate this mode
