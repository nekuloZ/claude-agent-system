---
name: weekly_review_archiver
description: Use when user says "WeeklyArchive", "周归档" at end of week for weekly summary and trend analysis
version: v2.4
last_updated: 2026-03-20
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式)
> **斜杠命令:** `/weekly`

# 周归档 Skill

执行周归档操作，基于每日 JSON 日志进行统计分析和趋势分析。

---

## 触发词

- **周归档：** `WeeklyArchive` 或 `周归档`

---

## 关键规则

1. **必须先展示计划，等用户说"确认"才能执行**
2. **周复盘时清空 scratchpad**，开始新一周
3. **优先使用 JSON 数据**进行统计分析

---

## 数据来源

- **每日 JSON 日志:** `记忆库/L1_长期记忆/01-Daily/.data/YYYY-MM-DD.json`（最近7天）
- **项目文件:** `记忆库/L1_长期记忆/Projects/*.md`
- **目标文件:** `记忆库/L3_Semantic/metrics_goals.md`
- **任务状态:** `记忆库/L0_工作区/.current_task.json`

---

## 执行流程

### Step 1: 确认归档意图

展示计划：
```
准备执行周归档，将会：
1. 读取 7 天的 Daily_Logs JSON 数据
2. 生成周报（统计分析和趋势）
3. 更新项目进度
4. 更新目标文件（metrics_goals.md）
5. 清空 scratchpad 开始新一周

确认执行吗？
```

### Step 2: 读取每日摘要

读取最近 7 天的 JSON 日志，提取：
- 每日核心产出（highlights）
- 项目进展（tasks.completed）
- 课题洞察（insights 数组）
- 习惯数据（habits 对象）
- 状态评分（state 对象）

**如果缺失 JSON 文件：** 提供选项 [R]从MD恢复 [I]忽略缺失 [C]取消

### Step 3: 更新项目进度

1. 扫描 `L1_长期记忆/Projects/*.md`
2. 汇总本周进展：一句话总结、Overall Completion 更新、下周重点目标

### Step 4: 检查停滞任务

1. 读取 `.current_task.json`
2. 检查 day_count > 7 的任务
3. 在周报中提醒停滞任务
4. 更新日期为新一周开始

### Step 5: 更新目标文件

1. 标记本周目标完成情况（✅ 已完成 / ⚠️ 部分达成 / ❌ 未达成）
2. 根据本周数据建议下周目标
3. 更新目标更新历史

### Step 6: 生成周报

**周报内容：**
1. **Daily Highlights** - 7天的一句话产出
2. **Project Progress** - 简要进度 + 链接
3. **Weekly Analytics** - 自动数据分析
4. **⚡ 能量优化建议** - 基于7天能量数据的趋势分析和建议

**保存位置：** `记忆库/L1_长期记忆/Weekly_Logs/YYYY-Www.md`

### Step 7: 重置 scratchpad（适配 v5.2 结构）

**scratchpad v5.2 结构：**
```
## 今日对话摘要
（今天的对话记录，待填充）

---

## 归档摘要区
### YYYY-MM-DD
[本周归档]
```

**周复盘时执行：**
1. **归档摘要区内容已在上周日志中**，无需迁移
2. **清空今日对话摘要**：改为"（今天的对话记录，待填充）"
3. **更新头部日期**：`# AI短期记忆 - YYYY-MM-DD`（周一日期）
4. **更新周号**：`| **周** | YYYY-Www`
5. **保留未闭环事项**：从 scratchpad 读取到周报中

**注意：** 归档摘要区的历史记录保留在 scratchpad 中（本周结束后会由日归档继续追加）

### Step 8: 调用 record skill（显式联动）

使用 Skill 工具显式调用 record，确保周归档信息被记录：

```python
Skill({
  skill: "record",
  args: "--mode skill结果 --skill weekly_review_archiver --content '周归档完成：YYYY-Www，生成周报 L1_长期记忆/Weekly_Logs/YYYY-Www.md，scratchpad 已重置'"
})
```

---

## 输出摘要

```
✅ 周归档完成！

📊 本周总结：[一句话概括]
📁 周报位置：L1_长期记忆/04-Weekly/YYYY-Www.md
📈 项目进度已更新
⚡ 能量优化建议已生成
🎯 目标文件已更新
📊 .current_task.json 已检查（停滞任务提醒）
📝 scratchpad 已重置（新一周开始）
```

---

## 注意事项

- ⚠️ **归档前必须确认**，避免误操作
- JSON 用于统计分析，减少上下文消耗
- 周复盘时**清空 scratchpad**，日复盘时**不清空**
