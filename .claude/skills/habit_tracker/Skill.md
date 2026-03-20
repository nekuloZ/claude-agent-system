---
name: habit_tracker
description: P1 PRIORITY - ALWAYS use when user mentions sleep ("昨晚X点睡Y点起", "几点睡几点起", "睡了X小时"), shower ("今天洗澡了", "洗澡了", "没洗澡"), or uses "/habit", "睡眠记录", "习惯统计". Track daily habits and energy state.
version: v1.3
last_updated: 2026-03-13
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式)

# 习惯追踪器

管理 habit_data.json，提供习惯数据的录入、查询、归档功能。

---

## 触发词

| 意图 | 触发词 |
|------|--------|
| 显示状态 | `/habit`、"习惯" |
| 录入睡眠 | "昨晚X点睡Y点起"、"几点睡几点起" |
| 查询历史 | "睡眠记录"、"近几天"、"习惯统计" |
| 洗澡记录 | "今天洗澡了"、"洗澡了" |
| 手动归档 | "归档习惯"、"习惯归档" |

---

## 文件路径

- **数据文件:** `记忆库/L0_工作区/habit_data.json`

---

## 数据结构

```json
{
  "metadata": { "version": "1.0", "last_updated": "YYYY-MM-DD" },
  "targets": { "sleep": "22:30", "wake": "06:00", "sleep_hours": 7.5 },
  "today": {
    "date": "YYYY-MM-DD",
    "actual_sleep": "HH:MM",
    "actual_wake": "HH:MM",
    "sleep_duration_hours": 7.0,
    "predicted_energy": "充沛"/"一般"/"疲惫"
  },
  "history": [ /* 最近7天记录 */ ],
  "last_shower_date": "YYYY-MM-DD"
}
```

---

## 执行流程

### 显示状态

1. 读取 habit_data.json
2. 显示：今日数据、目标设定、最近3天记录

### 录入睡眠

1. 解析用户输入（提取入睡和起床时间）
2. 计算睡眠时长（处理跨夜）
3. 预测精力状态
4. 更新 today 字段

### 显示历史

1. 读取 history 数组
2. 显示近7天记录表格
3. 计算统计：平均时长、目标达成率

### 更新洗澡

1. 更新 last_shower_date 为今天

### 手动归档

1. 将 today 数据移入 history 头部
2. history 只保留最近7天
3. 清空 today 字段

---

## 与其他 Skill 关系

| Skill | 职责 | 调用关系 |
|-------|------|---------|
| session_startup | 早上收集睡眠数据 | 可调用 habit_tracker 录入 |
| daily_review_archiver | 晚上归档习惯数据 | 调用归档逻辑 |
