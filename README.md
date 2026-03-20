# Agent 系统
_最后更新：2026-03-20_

## 项目目标

将 Jarvis 个人 AI 助手系统整理、标准化后发布到 Git，
供同事基于 Claude Code 搭建自己的 Agent 系统。

支持平台：**Windows + macOS**

---

## 当前状态

**已完成 v1.0**

### 待完成

**P0 - 核心结构**
- [x] 梳理通用 Skills 清单（确认留/剔列表）
- [x] 创建中文记忆骨架（4 层目录 + 中文 README）

**P1 - 配置模板化**
- [x] 整理 CLAUDE.md 模板版（加 AI-TODO 标注，剥个人内容）
- [x] 整理 rules/ 模板版（user-context 改为模板）
- [x] 编写全局 Skills 配置文档（清单 + 安装指南）
- [x] 统一所有文件路径（skills/hooks/rules 硬编码路径改为中文）

**P2 - 跨平台**
- [x] 编写 macOS 适配文档（对照表 + 建议方案）
- [x] Hooks 改为跨平台（Node.js 替代 PowerShell 命令）

**P3 - 收尾**
- [x] 编写快速上手 README（面向 agent 的初始化说明）

---

## 系统架构概览

```
.claude/                    # Claude Code 配置（标准目录）
├── CLAUDE.md              # 系统入口，AI 行为规范
├── settings.json          # Hooks 配置
├── hooks/                 # 事件钩子（Node.js）
├── skills/                # 本地 Skills
├── rules/                 # 模块化规则
└── mode-system/           # 5模式配置

记忆库/                     # 记忆系统（中文命名）
├── L0_工作区/              # 工作层（今日记录、待办、习惯数据）
├── L1_长期记忆/            # 长期层（日志、项目、周报）
├── L2_知识库/              # 知识层（流程文档、系统说明）
└── L3_用户档案/            # 用户层（身份、主题、学习）
```

---

## 快速开始

### 1. 克隆仓库

```bash
git clone <仓库地址> my-agent-system
cd my-agent-system
```

### 2. 初始化配置

让你的 Claude Code agent 读取 `docs/setup-guide.md`，按清单检查并安装依赖。

### 3. 自定义个人信息

修改以下文件中的 `AI-TODO` 标注：
- `.claude/CLAUDE.md` - 系统入口
- `.claude/rules/common/04-user-context.md` - 用户档案
- `记忆库/L3_用户档案/01-身份/` - 身份定义

### 4. 开始使用

```
在 Claude Code 中：
> 进入项目：XXX
> 创建任务：YYY
> 开始搞 ZZZ
```

---

## 相关文档

### 项目文档 (docs/)
- **设计文档**：`docs/plans/2026-03-20-agent-system-design.md`
- **Skills 清单**：`docs/skills-inventory.md`
- **环境配置**：`docs/setup-guide.md`
- **macOS 适配**：`docs/macos-adaptation.md`

### 记忆库参考文档 (记忆库/L2_知识库/参考文档/)
- **文件路径规范**：`记忆库/L2_知识库/参考文档/文件路径规范.md`
- **Obsidian 使用指南**：`记忆库/L2_知识库/参考文档/obsidian使用指南.md`
- **记忆检索策略**：`记忆库/L2_知识库/参考文档/记忆检索策略.md`
- **Smart Web Router 设计**：`记忆库/L2_知识库/参考文档/smart-web-router设计.md`

---

## 项目原则

1. **架构相同，内容自定义** - 同事 clone 后自定义内容，架构保持一致
2. **面向 Agent** - 所有文档面向 Claude Code agent，不是人类用户
3. **全中文命名** - 记忆系统使用中文目录名，降低理解成本
4. **跨平台** - Windows + macOS 双平台支持

---

*已完成 v1.0 - 2026-03-20*
