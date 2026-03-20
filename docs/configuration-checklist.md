# 配置清单 - 克隆后需自行完成的项目
_最后更新：2026-03-20_

本文档列出所有克隆本仓库后需要**手动配置**的项目，按优先级排列。

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

### 3. 必装全局 Skills

以下 Skills 需安装到 `~/.claude/skills/`，本仓库不含这些文件。

| Skill | 用途 | 获取方式 |
|-------|------|---------|
| **obsidian-markdown** | 写入 .md 文件（UTF-8 编码），必须依赖 | `/skill install obsidian-markdown` |
| **smart-web-router** | 网络搜索/抓取路由，所有网络操作的入口 | `/skill install smart-web-router` |

---

## P1 - 强烈建议完成（使用体验大幅提升）

### 4. 推荐全局 Skills

| Skill | 用途 | 获取方式 |
|-------|------|---------|
| **brainstorming** | 创意工作前必用 | `/skill install brainstorming` |
| **planning-with-files** | 多步骤任务制定计划 | `/skill install planning-with-files` |
| **requesting-code-review** | 代码审查 | `/skill install requesting-code-review` |
| **systematic-debugging** | 系统化调试 | `/skill install systematic-debugging` |
| **skill-development** | 开发自定义 Skill | `/skill install skill-development` |
| **hook-development** | 开发自定义 Hook | `/skill install hook-development` |
| **frontend-design** | 前端界面设计 | `/skill install frontend-design` |

### 5. 网络工具配置

`smart-web-router` 使用以下工具，按需安装：

| 工具 | 用途 | 安装命令 | 优先级 |
|------|------|---------|--------|
| **Tavily CLI** | 网络搜索/内容提取（首选） | `pip install tavily` | P1 |
| **defuddle** | 静态网页净化提取 | `pip install defuddle` | P2 |
| **opencli** | 社交平台内容（B站/Twitter等） | `pip install opencli` | P2 |
| **SearXNG** | 自建搜索引擎（可选） | 自行部署 Docker | P3 |

**Tavily 认证**（安装后必须完成）：
```bash
tvly login --api-key tvly-YOUR_API_KEY
```

**Windows 编码修复**（Tavily 在 Windows 上必须）：
```bash
# 每次调用前加 PYTHONIOENCODING=utf-8
PYTHONIOENCODING=utf-8 tvly search "关键词" --json
```

---

## P2 - 可选（按需配置）

### 6. 语言学习 Skills（如有需要）

| Skill | 用途 | 安装方式 |
|-------|------|---------|
| vocabulary_manager | 词汇管理 | 已包含在本仓库 `.claude/skills/` |
| shadowing_manager | 影子跟读 | 已包含在本仓库 `.claude/skills/` |
| short_sentence_trainer | 短句训练 | 已包含在本仓库 `.claude/skills/` |

> 这 3 个 Skill 已在仓库中，但默认未启用语言学习模式。进入 `/learn` 模式后即可使用。

### 7. Office 文件处理

如需创建 Word/Excel/PPT：

| Skill | 用途 | 获取方式 |
|-------|------|---------|
| **docx** | Word 文档 | `/skill install docx` |
| **xlsx** | Excel 表格 | `/skill install xlsx` |
| **pptx** | PPT 演示文稿 | `/skill install pptx` |
| **pdf** | PDF 处理 | `/skill install pdf` |

### 8. 代理配置（访问境外网站）

如果需要访问 Twitter/YouTube/Reddit 等：

```bash
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:10808"
$env:HTTPS_PROXY="http://127.0.0.1:10808"

# macOS/Linux
export HTTP_PROXY="http://127.0.0.1:10808"
export HTTPS_PROXY="http://127.0.0.1:10808"
```

端口根据你的代理软件调整。

---

## P3 - 高级扩展（有需要再配置）

### 9. RAG 记忆搜索（语义搜索）

如需跨会话语义搜索历史记录：

1. 申请 **Gemini API Key**（用于 embedding）
2. 部署 **Supabase** 项目（用于向量存储）
3. 配置 `tools/memory_search/` 目录下的脚本

> 参见：`记忆库/L2_知识库/参考文档/记忆检索策略.md`

### 10. 多 Agent 协作

如需多 Agent 同步协作（如本地 + VPS Agent）：

1. 配置 `~/.claude/skills/global_agent_protocol/config.json`
2. 申请 Supabase 项目并配置 `agent_task_progress` 表
3. 配置目标 Agent（远程或本地）

### 11. 自定义 Skill 开发

如需开发自己的 Skill：

```
.claude/skills/my-skill/
├── Skill.md          # Skill 指令文件
└── CHANGELOG.json    # 版本历史
```

参考现有 Skill 结构，触发词写在 `Skill.md` 的 `description` 字段中。

---

## 快速验证清单

配置完成后，在 Claude Code 中执行以下验证：

```
□ 说 "hey"，检查 session_startup 是否响应
□ 说 "创建任务：测试任务"，检查 task_manager 是否触发
□ 说 "要做个测试"，检查 action_manager 是否触发
□ 输入 /dev，检查模式切换是否正常
□ 说 "搜索 Claude Code 最新功能"，检查 smart-web-router 是否路由正确
□ 说 "Archive"，检查日复盘归档是否正常
```

---

## 技术支持

遇到问题，优先查阅：
- `docs/setup-guide.md` - 环境安装详细步骤
- `docs/macos-adaptation.md` - macOS 专项适配
- `记忆库/L2_知识库/参考文档/smart-web-router设计.md` - 网络工具故障排查
- `记忆库/L2_知识库/参考文档/记忆检索策略.md` - 记忆系统说明
