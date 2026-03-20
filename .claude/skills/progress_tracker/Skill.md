---
name: progress_tracker
description: ALWAYS use when conversation pauses/ends or user signals break with "先这样", "先这样吧", "下次再说", "明天再弄", "休息一下", "先做到这", "结束了", "聊完了", "bye", or "开始搞XXX". MUST track progress and record to scratchpad at every session end or task interruption.
version: v3.3
last_updated: 2026-03-13
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)

# 进展追踪器

对话结束时自动生成总结，识别节点类型，调用 record 写入 scratchpad。

---

## 触发词

**对话结束信号：**
- "先这样"、"先这样吧"、"就这样"
- "下次再说"、"明天再弄"、"下午再试"

**关键 skill 调用后：**
- task_completion、theme_insight_tracker
- munger_observer、overcome-problem
- daily_review_archiver

---

## 节点类型识别

| 节点类型 | 触发信号 | 写入位置 |
|---------|---------|---------|
| 任务进展 | 任务相关动作 | 今日对话摘要 |
| 任务完成 | "完成了"、"搞定" | 今日对话摘要 |
| 洞察/发现 | "我发现"、"原来" | 核心洞察 |
| 决策/承诺 | "我决定"、"试试看" | 今日决策 |
| 卡点/问题 | "卡在"、"报错" | 卡点 |
| 未闭环 | "等回复"、"待确认" | 未闭环事项 |

---

## 执行流程

1. **分析对话内容** → 提取关键信息（话题、持续时间、动作、卡点、洞察）
2. **判断节点类型** → 确定写入位置
3. **更新 `.current_task.json`** → 如果有活跃任务，更新 last_session
4. **调用 record** → 写入 scratchpad

---

## 过滤规则（不记录）

- 纯查询（"几点了"、"天气"）
- 简单确认（"好的"、"可以"）
- 礼貌回应（"谢谢"）

---

## 与 record 配合（显式联动）

progress_tracker 生成总结后，**使用 Skill 工具显式调用 record**：

```python
# 根据节点类型选择 mode
const mode = nodes.includes("洞察") ? "洞察" : "对话总结";

Skill({
  skill: "record",
  args: `--mode ${mode} --content '${生成的总结}'`
});
```

**联动时机**：
- 对话结束时（"先这样"）
- 关键 skill 调用后（task_completion、theme_insight_tracker 等）
- 用户明确说"记录一下"时

**联动效果**：
- 自动识别节点类型，选择正确的写入位置
- 无需用户手动调用 record
- 确保重要进展不遗漏
