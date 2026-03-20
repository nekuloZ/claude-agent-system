---
name: task_manager
description: L2层级任务管理（1-3天粒度）- ALWAYS use when user says "创建任务：XXX", "新任务：XXX", "开始任务：XXX", "切换到XXX任务", "任务XXX进展", "归档任务XXX", or "任务XXX完成了". Manages task folders with automatic project context linkage for multi-day deliverables.
version: v2.4
last_updated: 2026-03-18
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式)
> **斜杠命令:** `/task`

# 任务管理器

管理 L2 任务工作区，维护当前激活任务上下文。

---

## 三层架构定位

| 层级 | 粒度 | 负责 Skill |
|------|------|-----------|
| L3 | 大工程（多天/多周） | project_manager |
| L2 | 任务（1-3天，明确交付物） | task_manager（本 Skill） |
| L1 | 原子动作（小时级） | action_manager |

---

## 触发词

| 意图 | 触发词 |
|------|--------|
| 创建任务 | "创建任务：XXX"、"新任务：XXX"、"开始研究XXX" |
| 激活任务 | "开始任务：XXX"、"切换到XXX任务" |
| 更新状态 | "任务XXX进展"、"更新XXX状态" |
| 完成任务 | "任务XXX完成了"、"归档任务XXX" |

---

## 自动触发检测（v2.4 新增）

本 Skill 支持智能场景路由自动检测，作为 **assistant（助手场景）** 的核心组成部分。

### 检测逻辑

启动时检查 `.claude/.pending_signal.json`：

1. **文件存在且 timestamp 在 5 分钟内？**
2. **scene 匹配 "assistant" 且包含任务相关 keywords？**
3. **符合条件 → 按 scene-router 配置预加载记忆**
4. **清理 signal 文件，进入正常执行流程**

### 助手场景信号示例

```json
{
  "scene": "assistant",
  "confidence": 0.75,
  "keywords": ["任务", "创建"],
  "triggerText": "创建一个新任务来整理数据"
}
```

### 预加载内容

当检测到助手场景信号且涉及任务管理时，自动预加载：
- `scratchpad.md`（今日工作记录）
- `next_actions_kanban.md`（待办看板）
- `.current_task.json`（当前激活任务）
- `.active_project.json`（项目上下文）
- `tasks/` 目录（历史任务列表）

### 触发示例流程

```
用户: "创建任务：整理数据"
    ↓ Signal Hook 检测到 assistant 场景 (confidence: 0.75)
    ↓ 关键词匹配: ["任务", "创建"]
    ↓ 写入 .pending_signal.json
    ↓ task_manager 启动
    ↓ 检测到信号，预加载当前任务和项目上下文
    ↓ 询问: "要在 [财务看板] 项目下创建吗？"
    ↓ 创建任务并关联上下文
```

### 场景感知的能力增强

预加载后，task_manager 可以：
- **感知当前项目**：自动建议将任务创建在当前项目中
- **感知进行中的任务**：提示"你目前有 3 个进行中的任务"
- **感知待办关联**：新任务自动关联相关待办项
- **感知历史模式**：类似任务的历史完成情况

### 手动触发（无信号时）

如果信号不存在或过期，按原有触发词逻辑执行：
- "创建任务：XXX"
- "开始任务：XXX"
- "任务XXX完成了"

---

## 文件路径

- **独立任务:** `tasks/[{{状态}}] {{任务名}}/`
- **项目内任务:** `projects/{{项目名}}/tasks/[{{状态}}] {{任务名}}/`
- **当前任务:** `记忆库/L0_工作区/.current_task.json`
- **项目上下文:** `.claude/.active_project.json`

---

## 任务目录结构

```
tasks/[进行中] {{任务名}}/
├── task_description.md    # 任务目标、进展记录、待办
├── docs/                  # 任务文档
└── data/                  # 任务数据
```

---

## 执行流程

### 创建任务

1. 检测项目上下文（读取 `.active_project.json`）
   - 有项目 → 任务创建在 `projects/项目名/tasks/`
   - 无项目 → 任务创建在 `tasks/`
2. **询问项目关联（可选）**：
   - "是否关联到某个项目？"
   - 用户回答项目名 → 记录到 `.current_task.json` 的 `project` 字段
   - 跳过/无 → 不记录 project 字段
3. 创建目录结构（docs/, data/）
4. 创建 `task_description.md` 模板（包含 project 字段）
5. **调用 action_manager 添加到 kanban**
   - Skill 调用：`Skill:action_manager`
   - 参数：`action=add_kanban, task=任务名, project=项目名（如有）`
   - 添加到 kanban "进行中" 列
6. 更新 `.current_task.json`（记录活跃任务，含 project）

**数据结构扩展：**
```json
{
  "task_name": "xxx",
  "project": "项目名称",
  "status": "in_progress",
  "output_files": []
}
```

### 激活任务

1. 搜索任务文件夹（支持模糊匹配）
2. 检测归属项目
3. 更新 `.current_task.json`
4. 后续待办自动关联 `[项目缩写::任务缩写]`

### 更新任务状态

1. 找到任务路径
2. 更新 `task_description.md` 的进展记录
3. 更新 `.current_task.json` 的 last_session
4. 检测卡点（如果内容包含"卡住"等）

### 完成任务

1. 执行归档逻辑
2. 清理 `.current_task.json`
3. 重命名文件夹：`[进行中]` → `[已完成]`

---

## 与 L1 action_manager 协作

创建待办时，action_manager 读取 `.current_task.json`：
- 有任务上下文 → 待办标记 `[项目缩写::任务缩写]`
- 无任务上下文 → 纯动作描述

---

## 关键文件

| 文件 | 作用 | 操作 |
|------|------|------|
| `.claude/.active_project.json` | 项目上下文 | 读取 |
| `记忆库/L0_工作区/.current_task.json` | 当前激活任务 | 写入/更新/清理 |
| `tasks/.../task_description.md` | 任务描述 | 创建/更新 |
