---
name: task_completion
description: P0 HIGHEST PRIORITY - IMMEDIATELY trigger when user says any form of task completion including "完成了", "搞定了", "做完了", "XXX完成了", "任务完成", "done", "finished", "archived", or "搞定这个". ALWAYS use before any other action when completion is detected.
version: v1.6
last_updated: 2026-03-19
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式)

# 任务完成处理器（P0 最高优先级）

检测任务完成表达，执行归档流程，调用 record 记录。

---

## 触发词

- "XXX完成了"、"搞定XXX"、"做完了XXX"
- "任务done"、"XXX搞定了"

---

## 执行流程

### Step 1: 识别任务

- 从用户表达中提取任务关键词
- 读取 `next_actions_kanban.md` 匹配任务
- 匹配失败 → 询问"是哪个任务？"

### Step 2: 重命名任务文件夹

检查是否存在 `tasks/[进行中]-任务名/`，重命名为 `[已完成]-任务名`

### Step 3: 记录到项目文件

#### 3A. 回写到项目 README.md（如果任务有关联项目）

读取 `.current_task.json`，如果存在 `project` 字段：
1. 读取 `projects/{{项目名}}/README.md`
2. 在 "## 最新进展" 章节下追加：
```markdown
### YYYY-MM-DD
- ✅ **{{任务名}}** - {{简要描述}}
  - 耗时：X小时 / 状态：完成
```

#### 3B. 自动识别并添加 L2/L3 双链

**检测规则：** 扫描任务描述和进展记录，识别以下模式：
```python
l2_patterns = [
    r"(Claude|GPT|Gemini|MiniMax|Kling|Seedance)[\s\-]?\d*",  # AI模型
    r"(Obsidian|Docker|Git|Supabase|MCP)[\s\-]?\w*",         # 工具/技术
    r"(REST|API|SDK|WebSocket|GraphQL)",                      # 技术模式
]

l3_patterns = [
    r"拖延|焦虑|完美主义",                                    # 心理主题
    r"能量|精力|睡眠",                                        # 健康主题
    r"决策|优先级|时间管理",                                  # 效率主题
]
```

**执行流程：**
1. 读取 `task_description.md` 提取任务内容
2. 匹配 L2 技术/工具/模式 → 在 README "## 使用技术" 章节添加 `[[条目名]]`
3. 匹配 L3 主题 → 在 README "## 能力成长" 章节添加 `[[主题名]]`
4. 如果 L2 条目不存在，询问是否创建

**示例输出：**
```markdown
## 使用技术
- [[minimax]] - 用于代码生成任务
- [[obsidian]] - 知识管理

## 能力成长
- [[克服拖延]] - 任务拆解能力
```

#### 3C. 归档到长期记忆（原有逻辑）
追加到 `记忆库/L1_长期记忆/02-Projects/{{项目}}.md`：
```markdown
### YYYY-MM-DD (周X)
**[完成时间]** 任务标题
- ✅ 任务描述
```

### Step 4: 更新 Kanban 看板

**调用 action_manager 完成并清理 kanban：**
```
Skill:action_manager
args: action=complete_and_cleanup_kanban, task=任务名
```

- 任务移到"已完成"列（当日显示）
- 添加完成标记：`✅ YYYY-MM-DD`
- **归档到历史**：从当前看板移除，追加到 `kanban_archive.md` 或看板底部的"历史归档"区域

**清理规则：**
- 当天完成的：保留在"已完成"列（带日期）
- 跨天后：自动归档到历史区域，保持看板整洁

### Step 5: 更新 .current_task.json

- 从 active_tasks 移除
- 添加到 completed_today

### Step 6: 调用 record skill（显式联动）

使用 Skill 工具显式调用 record，确保完成信息被记录：

```python
Skill({
  skill: "record",
  args: "--mode skill结果 --skill task_completion --content '任务[任务名]已完成，耗时[X小时]' --kanban_action move_to_done --kanban_task '[任务名]'"
})
```

**调用时机**：
- 任务文件夹重命名后
- 项目文件更新后
- Kanban 更新后

**联动效果**：
- record skill 自动写入 scratchpad（今日对话摘要）
- 如指定 kanban_action，同步更新 kanban 看板
- 无需用户手动说"记录一下"

---

## 输出确认

```
✅ 任务完成：{{任务标题}}
- 任务文件夹：[已完成]-任务名称
- 已记录到项目：{{项目名}}
- 已更新 Kanban 看板
- 已更新 .current_task.json
```

---

## 错误处理

| 场景 | 处理 |
|------|------|
| 找不到任务 | 询问"是哪个任务？" |
| 多个匹配 | 列出让用户确认 |
| 无项目任务 | 只调用 record，不写项目文件 |
| 无任务文件夹 | 跳过重命名步骤 |
