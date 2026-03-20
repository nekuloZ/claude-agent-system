# 环境依赖与配置指南
_最后更新：2026-03-20_

<!-- AI-TODO: 根据同事的实际情况，检查并安装缺失的依赖 -->

## 1. 基础环境依赖

以下环境必须安装才能运行本系统。

### 1.1 Claude Code CLI

**用途**：整个 Agent 系统的宿主环境。

**安装**：
```bash
npm install -g @anthropic-ai/claude-code
```

**验证**：
```bash
claude --version
```

### 1.2 Node.js 18+

**用途**：Hooks 脚本和 Skills 的运行时。

**安装方式（选择其一）**：

**macOS (Homebrew)**：
```bash
brew install node
```

**Windows**：
- 下载安装包：https://nodejs.org
- 或使用 chocolatey：`choco install nodejs`

**验证**：
```bash
node --version  # 应显示 v18.x 或更高
```

### 1.3 Git

**用途**：版本管理。

**macOS**：
```bash
brew install git
```

**Windows**：
- 下载安装包：https://git-scm.com
- 或使用 chocolatey：`choco install git`

**验证**：
```bash
git --version
```

---

## 2. 全局 Skills 清单

以下 Skills 需要安装到全局目录 `~/.claude/skills/`。

### 2.1 核心依赖（必须）

| Skill | 用途 | 来源 |
|-------|------|------|
| obsidian-markdown | Markdown 文件写入（UTF-8 编码） | 内置或手动安装 |
| smart-web-router | 网络搜索路由 | 全局 skill registry |

### 2.2 推荐安装（强烈建议）

| Skill | 用途 | 来源 |
|-------|------|------|
| brainstorming | 创意工作、方案设计 | 全局 skill registry |
| planning-with-files | 实施计划制定 | 全局 skill registry |
| requesting-code-review | 代码审查请求 | 全局 skill registry |
| systematic-debugging | 系统化调试 | 全局 skill registry |
| skill-development | 开发新 Skill | 全局 skill registry |
| hook-development | 开发新 Hook | 全局 skill registry |

### 2.3 安装方式

**方式一：从 Claude Code skill registry 安装**

```bash
# 在 Claude Code 中执行
/skill install obsidian-markdown
/skill install smart-web-router
# ... 其他 skills
```

**方式二：手动复制**

如果你有 skills 的源代码：

```bash
# macOS
mkdir -p ~/.claude/skills/
cp -r /path/to/obsidian-markdown ~/.claude/skills/

# Windows PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse "C:\path\to\obsidian-markdown" "$env:USERPROFILE\.claude\skills\"
```

---

## 3. 初始化检查清单

同事 clone 仓库后，agent 按以下清单检查：

```markdown
- [ ] Node.js 18+ 已安装 (`node --version`)
- [ ] Git 已安装 (`git --version`)
- [ ] Claude Code CLI 已安装 (`claude --version`)
- [ ] 全局 Skills 目录存在 (`ls ~/.claude/skills/` 或 `dir %USERPROFILE%\.claude\skills`)
- [ ] obsidian-markdown skill 已安装
- [ ] smart-web-router skill 已安装
```

---

## 4. macOS 额外说明

macOS 用户可能需要以下额外配置：

### 4.1 终端编码

确保终端使用 UTF-8：
```bash
export LANG=zh_CN.UTF-8
```

### 4.2 权限

首次运行 Hooks 可能需要授予权限：
```bash
chmod +x ~/.claude/skills/*/hooks/*.js
```

---

<!-- AI-TODO: 初始化时逐项检查，如有缺失引导用户安装 -->
