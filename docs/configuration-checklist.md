# 配置清单 - 克隆后需自行完成的项目
_最后更新：2026-03-20_

本文档列出所有克隆本仓库后需要**手动配置**的项目，按优先级排列。

> **说明**：本仓库的 `.claude/skills/` 包含 18 个**本地 Skill**（跟项目走，克隆即可用）。
> 本文档列出的是需要额外安装到 `~/.claude/skills/` 的**全局 Skill**，以及其他配置项。

---

## P0 - 必须完成（系统无法运行）

### 1. 基础环境

| 依赖 | 用途 | 安装命令 |
|------|------|---------|
| **Node.js 18+** | Hooks 脚本运行时 | `brew install node` / [nodejs.org](https://nodejs.org) |
| **Git** | 版本管理 | `brew install git` / [git-scm.com](https://git-scm.com) |
| **Claude Code CLI** | Agent 系统宿主 | `npm install -g @anthropic-ai/claude-code` |

### 2. 个人信息配置

克隆后，在以下文件中搜索 `AI-TODO`，替换为你自己的信息：

| 文件 | 需要填写的内容 |
|------|--------------|
| `.claude/rules/common/04-user-context.md` | 姓名、时区、作息时间、工作原则 |
| `记忆库/L3_用户档案/01-身份/identity.md` | 自我定义（AI 只读，不自动修改） |
| `记忆库/L3_用户档案/01-身份/values.md` | 核心价值观 |
| `记忆库/L3_用户档案/01-身份/goals.md` | 当前目标 |

### 3. 必装全局 Skills（`~/.claude/skills/`）

以下 Skills 需安装到 `~/.claude/skills/`，本仓库不含这些文件。

| Skill | 用途 |
|-------|------|
| **obsidian-markdown** | 写入 .md 文件（UTF-8 编码）— 记忆系统必须依赖 |
| **smart-web-router** | 所有网络搜索/抓取的统一入口 |

---

## P1 - 强烈建议（开发工作流必备）

### 4. 推荐全局 Skills（`~/.claude/skills/`）

| Skill | 用途 |
|-------|------|
| **brainstorming** | 任何创意/方案工作前必用 |
| **planning-with-files** | 多步骤任务制定实施计划 |
| **writing-plans** | 从需求写执行计划 |
| **executing-plans** | 执行已写好的计划 |
| **requesting-code-review** | 完成功能后请求代码审查 |
| **receiving-code-review** | 接收审查反馈并处理 |
| **systematic-debugging** | 遇到 bug 时系统化排查 |
| **test-driven-development** | TDD 开发流程 |
| **verification-before-completion** | 声称完成前先验证 |
| **frontend-design** | 生产级前端界面设计 |
| **skill-development** | 开发自定义 Skill |
| **hook-development** | 开发自定义 Hook |

### 5. 网络工具（`smart-web-router` 依赖）

| 工具 | 用途 | 安装 | 优先级 |
|------|------|------|--------|
| **Tavily CLI** | 网络搜索/内容提取（首选） | `pip install tavily` | P1 |
| **defuddle** | 静态网页净化提取 | `pip install defuddle` | P2 |
| **opencli** | 社交平台内容（B站/Twitter等） | `pip install opencli` | P2 |

**Tavily 认证**（安装后必须完成）：
```bash
tvly login --api-key tvly-YOUR_API_KEY
```

**Windows 编码修复**（Windows 必须）：
```bash
PYTHONIOENCODING=utf-8 tvly search "关键词" --json
```

---

## P2 - 可选（按需配置）

### 6. 浏览器自动化全局 Skills

| Skill | 用途 |
|-------|------|
| **agent-browser** | 网页交互/表单填写/截图 |
| **webapp-testing** | 本地 Web 应用测试 |

### 7. Office 文件处理全局 Skills

| Skill | 用途 |
|-------|------|
| **docx** | Word 文档创建/编辑 |
| **xlsx** | Excel 表格/数据分析 |
| **pptx** | PPT 演示文稿 |
| **pdf** | PDF 提取/创建/合并 |

### 8. 语言学习 Skills

> 这 3 个已包含在本仓库 `.claude/skills/` 中，进入 `/learn` 模式即可使用，无需额外安装。

| Skill | 用途 |
|-------|------|
| vocabulary_manager | 词汇/短语管理 |
| shadowing_manager | 影子跟读 |
| short_sentence_trainer | 短句训练 |

### 9. 代理配置（访问境外网站）

如果需要访问 Twitter/YouTube/Reddit 等：

```bash
# macOS/Linux
export HTTP_PROXY="http://127.0.0.1:10808"
export HTTPS_PROXY="http://127.0.0.1:10808"

# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:10808"
$env:HTTPS_PROXY="http://127.0.0.1:10808"
```

端口根据你的代理软件调整。

---

## P3 - 高级扩展（有需要再配置）

### 10. 多 Agent 协作全局 Skill

| Skill | 用途 |
|-------|------|
| **global_agent_protocol** | 跨 Agent 同步协议（需配置 Supabase） |
| **dispatching-parallel-agents** | 并行分发多个子 Agent |
| **subagent-driven-development** | 用子 Agent 执行计划 |

### 11. RAG 记忆搜索（语义搜索）

如需跨会话语义搜索历史记录：

1. 申请 **Gemini API Key**（用于 embedding）
2. 部署 **Supabase** 项目（用于向量存储）
3. 配置 `tools/memory_search/` 目录下的脚本

> 参见：`记忆库/L2_知识库/参考文档/记忆检索策略.md`

### 12. 自定义 Skill 开发

新 Skill 放在 `.claude/skills/` 或 `~/.claude/skills/`：

```
.claude/skills/my-skill/
├── Skill.md          # Skill 指令（含 description 触发词）
└── CHANGELOG.json    # 版本历史
```

参考 `docs/setup-guide.md` 中的 Skill 结构说明。

---

## 全局 Skill 安装方式

### 方式一：Claude Code 内安装

```bash
# 在 Claude Code 对话中
/skill install obsidian-markdown
/skill install smart-web-router
# ...
```

### 方式二：手动复制

```bash
# macOS/Linux
mkdir -p ~/.claude/skills/
cp -r /path/to/skill-name ~/.claude/skills/

# Windows PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse "C:\path\to\skill-name" "$env:USERPROFILE\.claude\skills\"
```

---

## 快速验证清单

配置完成后，在 Claude Code 中验证：

```
□ 说 "hey"，session_startup 正常响应
□ 说 "创建任务：测试任务"，task_manager 触发
□ 输入 /dev，模式切换正常
□ 说 "搜索 Claude Code 最新功能"，smart-web-router 路由正确
□ 说 "Archive"，日复盘归档正常
```

---

## 相关文档

- `docs/setup-guide.md` - 环境安装详细步骤
- `docs/macos-adaptation.md` - macOS 专项适配
- `docs/skills-inventory.md` - 本地/全局 Skill 完整清单
- `记忆库/L2_知识库/参考文档/smart-web-router设计.md` - 网络工具说明
