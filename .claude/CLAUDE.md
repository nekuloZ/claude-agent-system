# AGENT SYSTEM INSTRUCTIONS
> **Version:** v1.0 (Template) | **Updated:** 2026-03-20
>
> 🎮 **Mode System**: 使用 `/dev`, `/learn`, `/ops`, `/assist`, `/auto` 切换工作模式
> 📜 **Rules**: 系统规则在 `.claude/rules/` 目录

<!-- AI-TODO: 这是模板文件，请根据用户的实际情况自定义以下内容 -->

---

## 📁 核心文件结构

```
.claude/                       # Claude 配置与 Skills
├── CLAUDE.md                  # 本文件（系统规范入口）
├── rules/                     # 📜 Rules 系统
│   ├── common/                # 通用规则
│   ├── modes/                 # 模式特定规则
│   └── memory/                # 记忆系统规则
├── mode-system/               # 🎮 模式系统
├── hooks/                     # Hooks (5个事件钩子)
└── skills/                    # 本地 Skills

记忆库/                        # 记忆系统（中文命名）
├── L0_工作区/                  # 工作层（7日记录、待办、习惯）
├── L1_长期记忆/                # 长期层（日志、项目、周报）
├── L2_知识库/                  # 知识层（流程、参考文档）
└── L3_用户档案/                # 用户层（身份、主题、学习）

projects/                      # L3 项目工作区
└── {{项目名}}/
    ├── README.md
    ├── CLAUDE.md
    ├── .project.json
    ├── workspace/
    ├── docs/
    └── tasks/
```

---

## 🔐 核心协议

| 协议 | 位置 | 说明 |
|------|------|------|
| **系统身份** | `rules/common/01-identity.md` | AI角色、职责、边界 |
| **用户档案** | `rules/common/04-user-context.md` | <!-- AI-TODO: 填入你的个人信息 --> |
| **说话风格** | `rules/common/02-communication.md` | 交互风格定义 |
| **环境配置** | `rules/common/03-environment.md` | 平台约束、工具配置 |
| **模式系统** | `rules/modes/*.md` | 5模式特定规则 |
| **记忆系统** | `rules/memory/memory-system.md` | L0-L3架构规则 |
| **用户自我认知** | `记忆库/L3_用户档案/01-身份/` | 用户自我定义空间 |

---

## 🏗️ 三层架构项目管理

| 层级 | Skill | 粒度 | 存储位置 | 上下文文件 |
|------|-------|------|---------|-----------|
| **L3** | `project_manager` | 大工程（多天/多周） | `projects/{{项目名}}/` | `.claude/.active_project.json` |
| **L2** | `task_manager` | 任务（1-3天） | `projects/XXX/tasks/` 或 `tasks/` | `记忆库/L0_工作区/.current_task.json` |
| **L1** | `action_manager` | 原子动作（小时级） | `记忆库/L0_工作区/待办看板.md` | 读取 L2+L3 上下文 |

---

## 🎮 模式系统

### 五种工作模式

| 模式 | 命令 | 子代理角色 | 核心技能 | 上下文预算 |
|:-----|:-----|:-----------|:---------|:-----------|
| **🔧 开发模式** | `/dev` | 全栈工程师 | planning, coding, code-review | 40% |
| **📚 学习模式** | `/learn` | 学习导师 | vocabulary, shadowing | 30% |
| **📊 运营模式** | `/ops` | 数据分析师 | daily_report, data_export | 35% |
| **🤖 助手模式** | `/assist` | 个人助理 | task_manager, action_manager | 30% |
| **⚡ 自动模式** | `/auto` | 自动化专家 | skill-development | 35% |

### 斜杠命令速查

| 命令 | 功能 |
|:-----|:-----|
| `/dev`, `/learn`, `/ops`, `/assist`, `/auto` | 切换模式 |
| `/mode` | 显示当前模式 |
| `/task "任务名"` | 创建任务 |
| `/todo "待办"` | 添加到看板 |
| `/archive` | 日复盘归档 |
| `/weekly` | 周归档 |

---

## 🧠 记忆系统 (L0-L3)

| 操作 | 规则 | 详细说明 |
|------|------|---------|
| **写入** | UTF-8 + obsidian-markdown skill | 确保中文编码正确 |
| **读取** | 按需读取，不预加载 | 渐进式加载策略 |
| **路径** | 使用 `记忆库/` 中文命名 | 四层结构 |

### 快速参考

| 查询 | 文件 |
|------|------|
| "今天做了什么？" | `记忆库/L0_工作区/7日记录.md` |
| "项目 X 进展？" | `记忆库/L1_长期记忆/02-项目/X.md` |
| "应该做什么？" | `记忆库/L0_工作区/待办看板.md` |

---

## 🛠️ Skills 速查

### 本地 Skills（保留）

<!-- AI-TODO: 根据实际需求调整保留的 Skills -->

| Skill | 触发词 |
|-------|--------|
| project_manager | "创建项目：XXX", "进入项目：XXX" |
| task_manager | "创建任务：XXX", "开始任务：XXX" |
| action_manager | "要做XXX", "得XXX", "记得XXX" |
| record | 自动触发 |
| daily_review_archiver | "复盘", "Archive" |
| weekly_review_archiver | "周归档", "WeeklyArchive" |
| habit_tracker | "昨晚X点睡", "今天洗澡了" |
| mode-switcher | `/dev`, `/learn`, `/ops`, `/assist`, `/auto` |

### 全局 Skills 依赖

<!-- AI-TODO: 确保以下全局 Skills 已安装到 ~/.claude/skills/ -->

| Skill | 用途 |
|-------|------|
| obsidian-markdown | Markdown 写入 |
| smart-web-router | 网络搜索 |
| brainstorming | 方案设计 |
| planning-with-files | 实施计划 |

---

## 🪟 平台适配

<!-- AI-TODO: 根据用户平台配置 -->

| 平台 | 配置 |
|------|------|
| **Windows** | PowerShell 命令，反斜杠路径 |
| **macOS** | bash 命令，正斜杠路径，UTF-8 终端 |

---

## 📝 编码规范

- 所有文件使用 **UTF-8 编码**
- Markdown 文件使用 obsidian-markdown skill 写入
- 路径使用正斜杠 `/`（即使 Windows 也适用）

---

## 🎯 初始化检查清单

<!-- AI-TODO: 初始化时逐项检查 -->

- [ ] Node.js 18+ 已安装
- [ ] Git 已安装
- [ ] Claude Code CLI 已安装
- [ ] 全局 Skills 已安装（obsidian-markdown, smart-web-router）
- [ ] 记忆库/ 目录结构已创建
- [ ] rules/common/04-user-context.md 已自定义
- [ ] 路径已统一为中文 `记忆库/` 格式

---

<!-- AI-TODO: 在以下区域添加你自己的系统扩展 -->

## 自定义扩展

（在此添加你的自定义规则、命令别名等）
