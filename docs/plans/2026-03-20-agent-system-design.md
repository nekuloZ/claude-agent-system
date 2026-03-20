# Agent 系统设计文档
_最后更新：2026-03-20_

## 项目目标

将 Jarvis 个人 AI 助手系统整理、标准化，发布到 Git，供同事基于 Claude Code 搭建自己的 Agent 系统。

---

## 核心设计原则

**真正受众是同事的 Claude Code agent，不是同事本人。**

- 注释风格：给 AI 的指令，不是手把手教人类
- 自定义标注：使用 `<!-- AI-TODO: 替换为你自己的... -->` 形式
- 迁移方式：同事用自己的 agent 读懂架构、迁移个人内容

---

## 路径规范（强制统一）

| 目录 | 用途 | 说明 |
|------|------|------|
| `.claude/` | Claude Code 配置 | 标准目录，保持英文 |
| `.claude/skills/` | 本地 Skills | 标准目录，保持英文 |
| `.claude/hooks/` | 事件钩子 | 标准目录，保持英文 |
| `.claude/rules/` | 规则文件 | 标准目录，保持英文 |
| `记忆库/` | 记忆系统根目录 | **中文命名**，替代 `jarvis-memory/` |
| `记忆库/L0_工作区/` | 工作层 | **中文命名** |
| `记忆库/L1_长期记忆/` | 长期层 | **中文命名** |
| `记忆库/L2_知识库/` | 知识层 | **中文命名** |
| `记忆库/L3_用户档案/` | 用户层 | **中文命名** |
| `docs/` | 项目文档 | 保持英文 |
| `scripts/` | 工具脚本 | 保持英文 |

**路径统一要求：**
- Skills 代码中硬编码的路径（如 `jarvis-memory/L0_Working/`）必须改为 `记忆库/L0_工作区/`
- Hooks 脚本中的路径引用必须同步更新
- `rules/` 中的示例路径必须统一

---

## 架构设计（6 个模块）

### 1. 核心配置（`.claude/`）

**保留内容：**
- `CLAUDE.md` — 系统入口，面向 AI 的架构说明 + 自定义标注
- `rules/` — 模块化规则目录（AI 读模块化文件比大文件更高效）
  - `common/` — 通用规则（identity、communication、environment、user-context、skills）
  - `modes/` — 5 种模式规则
  - `memory/` — 记忆系统规则
- `settings.json` — Hooks 配置
- `hooks/` — 5 个事件钩子（见 Hooks 模块）
- `skills/` — 通用本地 Skills（见 Skills 模块）

**处理方式：**
- 个人信息部分加 `<!-- AI-TODO -->` 标注
- `rules/common/04-user-context.md` 替换为模板文件，标注所有需要自定义的字段

---

### 2. 通用本地 Skills（`.claude/skills/`）

只保留架构通用的 Skills，剥除个人业务类 Skills：

**保留（通用）：**
| Skill | 功能 |
|-------|------|
| project_manager | L3 项目管理 |
| task_manager | L2 任务管理 |
| action_manager | L1 原子动作 |
| task_completion | 任务完成归档 |
| progress_tracker | 任务进展追踪 |
| record | 记忆持久化 |
| daily_review_archiver | 日复盘归档 |
| weekly_review_archiver | 周归档 |
| session_startup | 会话启动 |
| habit_tracker | 习惯记录（模板，字段可自定义）|
| mode-switcher | 模式切换 |
| theme_insight_tracker | 洞察追踪 |

**剔除（个人业务）：**
- `daily_report` — 连接 nekulo 的飞书表格
- `feishu_export` — 飞书专用
- `video_analyzer` — 业务专用
- `tts_reader` — 个人偏好
- `app_launcher` — Windows 路径硬编码
- `rtsc_manager` — OBS 专用
- `game_trainer_search` — 个人娱乐

---

### 3. 环境依赖与配置指南

提供 `docs/setup-guide.md`，包含两部分：

#### 3a. 环境依赖（运行前提）

| 依赖 | 用途 | 安装方式 |
|------|------|----------|
| **Claude Code CLI** | 整个系统的宿主 | `npm install -g @anthropic-ai/claude-code` |
| **Node.js 18+** | Hooks 脚本运行时 | https://nodejs.org |
| **Git** | 版本管理 | https://git-scm.com |

**macOS 额外：**
| 依赖 | 用途 | 安装方式 |
|------|------|----------|
| Homebrew（推荐） | 包管理 | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Node.js（via brew） | 推荐安装方式 | `brew install node` |

#### 3b. 全局 Skills 清单

本系统依赖以下全局 Skills（安装到 `~/.claude/skills/`），agent 可按清单逐一安装：

| Skill | 用途 |
|-------|------|
| brainstorming | 创意工作、方案设计 |
| planning-with-files | 实施计划制定 |
| requesting-code-review | 代码审查请求 |
| systematic-debugging | 系统化调试 |
| obsidian-markdown | Markdown 文件写入（必须） |
| smart-web-router | 网络搜索与内容获取 |
| skill-development | 开发新 Skill |
| hook-development | 开发新 Hook |

**安装方式：** 从 Claude Code skill registry 安装，或直接复制目录到 `~/.claude/skills/`（待补充具体命令）

---

### 4. 中文记忆骨架（`jarvis-memory/`）

**设计原则：**
- 4 层结构完整保留
- 每层有中文 README 说明作用
- 文件为空模板，带中文注释说明格式
- 同事的 agent 可将现有内容迁移进来

**目录结构（全中文命名）：**
```
记忆库/
├── 说明.md                    # 记忆系统总览（中文）
├── L0_工作区/                  # 工作层 - 当前工作窗口，含今日详情 + 近7天摘要
│   ├── 说明.md
│   ├── 7日记录.md              # 今日 + 近7天归档摘要（模板）
│   ├── 待办看板.md             # 待办事项（模板）
│   └── 习惯数据.json           # 习惯追踪数据（模板）
├── L1_长期记忆/                # 长期层 - 日志、项目、周报，长期保留
│   ├── 说明.md
│   ├── 01-日志/               # 每日工作日志
│   ├── 02-项目/               # 项目记忆文档
│   └── 周报/                  # 周复盘记录
├── L2_知识库/                  # 知识层 - 流程文档、系统说明，AI 按需读取
│   ├── 说明.md
│   ├── 核心文档/              # 系统架构、设计说明
│   └── 参考文档/              # 操作指南、最佳实践
└── L3_用户档案/                # 用户层 - 身份定义、主题、学习，永久保存
    ├── 说明.md
    ├── 01-身份/               # 用户自我定义（AI-TODO 标注）
    ├── 02-主题/               # 反复出现的人生课题
    └── 03-学习/               # 技能成长记录
```

---

### 5. macOS 适配

**方式：文档化，由 agent 处理替换**

提供 `docs/macos-adaptation.md`：
- PowerShell → bash 对照表
- 路径分隔符差异
- Node.js 跨平台替代方案（推荐）
- Hooks 脚本适配说明

**对照表（核心）：**
| Windows | macOS |
|---------|-------|
| `powershell -Command "Get-Date -Format yyyy-MM-dd"` | `date "+%Y-%m-%d"` |
| `powershell -Command "Get-Date -Format HH:mm"` | `date "+%H:%M"` |
| 反斜杠路径 `\` | 正斜杠路径 `/` |
| `node scripts/time.js` | 同，跨平台无需改动 |

**推荐方案：** Hooks 脚本改用 Node.js 实现，彻底跨平台。

---

### 6. 快速上手文档（`README.md`）

面向同事的 agent，说明：
1. 系统架构概览
2. 克隆后的初始化步骤
3. 必须自定义的文件清单（含 AI-TODO 位置）
4. 全局 Skills 安装
5. macOS / Windows 差异处理

---

## 任务拆解

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 梳理通用 Skills 清单 | 确认哪些留、哪些剔 |
| P0 | 创建中文记忆骨架 | 4 层目录 + README |
| P1 | 整理 CLAUDE.md 模板版 | 加 AI-TODO 标注，剥个人内容 |
| P1 | 整理 rules/ 模板版 | user-context 改为模板 |
| P1 | 全局 Skills 配置文档 | 清单 + 安装指南 |
| P1 | 统一所有文件路径 | skills/hooks/rules 中硬编码路径改为中文 |
| P2 | macOS 适配文档 | 对照表 + 建议方案 |
| P2 | Hooks 改为跨平台 | Node.js 替代 PowerShell |
| P3 | 整理快速上手 README | 面向 agent 的初始化说明 |

---

## 不在范围内

- 新增功能
- 重写现有 Skills 逻辑
- 同步 nekulo 个人内容
