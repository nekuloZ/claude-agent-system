---
name: project_manager
description: L3层级项目工作区管理 - ALWAYS use when user says "创建项目：XXX", "新建项目", "进入项目：XXX", "切换到XXX项目", "项目进展", "有哪些项目", "查看所有项目", "归档项目", or "退出项目". Manages multi-day/week engineering workspaces with automatic context tracking for L2 tasks and L1 actions. 负责项目相关文件的完整生命周期，包括工作区文件和记忆文档文件。
version: v1.3
last_updated: 2026-03-20
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式) / 🔧 dev (开发模式)

# 项目管理器

管理 L3 项目工作区，维护当前激活项目上下文。

---

## 三层架构定位

| 层级 | 粒度 | 负责 Skill |
|------|------|-----------|
| L3 | 大工程（多天/多周） | project_manager（本 Skill） |
| L2 | 任务（1-3天） | task_manager |
| L1 | 原子动作（小时级） | action_manager |

---

## 触发词

| 意图 | 触发词 |
|------|--------|
| 创建项目 | "创建项目：XXX"、"开新项目 XXX" |
| 进入项目 | "进入项目：XXX"、"切换到XXX项目" |
| 退出项目 | "退出项目"、"返回根目录" |
| 查看状态 | "项目进展"、"XXX项目状态" |
| 归档项目 | "归档项目：XXX"、"项目完成了" |
| 列出项目 | "有哪些项目" |

---

## 文件路径

- **项目目录:** `projects/{{项目名}}/`
- **激活标记:** `.claude/.active_project.json`
- **项目元数据:** `projects/{{项目名}}/.project.json`
- **记忆文档:** `记忆库/L1_长期记忆/02-Projects/{{项目名}}.md`

---

## 项目目录结构

```
projects/{{项目名}}/
├── README.md              # 项目目标、架构、当前状态
├── CLAUDE.md              # 项目专属 AI 指令（可选）
├── .project.json          # 项目元数据
├── workspace/
│   ├── data/              # 数据文件
│   ├── scripts/           # 工具脚本
│   └── output/            # 输出产物
├── docs/
│   ├── decisions/         # 决策记录
│   └── logs/              # 开发日志
└── tasks/                 # 项目专属任务
```

---

## 执行流程

### 创建项目

1. 检查项目是否已存在
2. 创建目录结构（workspace/data, workspace/scripts, workspace/output, docs/decisions, docs/logs, tasks）
3. 创建 `.project.json` 元数据（name, created, status, last_active）
4. 创建 README.md 模板（项目目标、当前状态、架构）
5. **创建记忆文档** `记忆库/L1_长期记忆/02-Projects/{{项目名}}.md`（Obsidian格式，含frontmatter）
6. 可选：创建 CLAUDE.md 项目专属指令

**记忆文档模板：**
```markdown
---
links:
  in: []
  out: []
type: note
updated: '{{YYYY-MM-DD}}'
---

# {{项目名}}

## 项目概述

（简短描述项目目标和用途）

---

## 项目日志

### {{YYYY-MM-DD}}

**状态：** 进行中

（记录关键进展、决策、问题）
```

### 进入项目

1. 检查项目是否存在
2. 更新 `.project.json` 的 last_active
3. 写入 `.claude/.active_project.json` 激活标记
4. 读取 README.md 显示当前状态

**上下文影响：**
- 后续创建的任务自动放到 `projects/项目名/tasks/`
- 待办自动前缀 `[项目名::]`

### 退出项目

1. 删除 `.claude/.active_project.json`
2. 新任务将放到根目录 tasks/

### 查看项目状态

1. 检查当前激活项目（或用户指定项目）
2. 读取 `.project.json` 和 README.md
3. 统计项目内任务数量
4. 显示：状态、最后活跃时间、任务数、README 当前状态

### 归档项目

1. 更新 `.project.json` status 为 "已归档"
2. 添加 archived_at 时间戳
3. 如果当前激活的是这个项目，清理激活标记

---

## 关键文件说明

| 文件 | 作用 | 谁读写 |
|------|------|--------|
| `.claude/.active_project.json` | 全局当前激活项目 | project_manager 写，其他 skill 读 |
| `projects/XXX/.project.json` | 项目元数据 | project_manager 读写 |
| `projects/XXX/README.md` | 项目状态描述 | 用户 + AI 协作更新 |
| `记忆库/L1_长期记忆/02-Projects/XXX.md` | 项目记忆文档 | project_manager 创建，AI 在项目生命周期内更新 |

---

## 与 L2/L1 协作

**向 task_manager 提供上下文：**
- 如果 `.active_project.json` 存在，任务创建在项目下的 tasks/ 目录
- 任务前缀自动添加 `[项目名::]`

**向 action_manager 提供上下文：**
- 待办自动关联 `[项目名::任务名]` 格式
