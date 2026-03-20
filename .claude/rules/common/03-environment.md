# 03-environment.md - 环境与工具规范

> **Rule Level:** L2 Standard
> **Last Updated:** 2026-03-18
> **Applies to:** All Modes

---

## 🖥️ Platform Constraints

### Windows + UTF-8 Environment

| Rule | Specification |
|------|---------------|
| **Encoding** | All files MUST use UTF-8 |
| **Terminal** | Treat as UTF-8 environment |
| **No GBK** | Never generate GBK-dependent content |
| **Control Chars** | Avoid non-UTF-8 control characters |

### Shell Selection
- **Primary:** PowerShell (Windows context)
- **Alternative:** cmd (when PS unavailable)
- **Cross-platform:** Provide WSL/Linux version when relevant

---

## ⏰ Time Commands

**CRITICAL:** 必须调用系统命令获取时间，禁止猜测。

```bash
# 当前时间 (Node.js 跨平台)
node scripts/time.js

# 当前日期 (Node.js 跨平台)
node scripts/date.js

# 完整时间戳 (Node.js 跨平台)
node scripts/datetime.js
```

**旧版 PowerShell（已弃用）：**
```powershell
# 不推荐，仅作参考
powershell -Command "Get-Date -Format 'HH:mm'"
```

---

## 🛠️ Tool Priority

### Web Operations
**Priority Order:**
1. **WebFetch** - Static pages (GitHub, docs, blogs)
2. **WebSearch** - Quick search results
3. **SearXNG** - Batch queries, research (self-hosted)
4. **agent-browser** - Complex interactions only (login, JS-render)

**Principle:** Prefer local/controllable tools, avoid external quotas.

### File Operations
**Priority Order:**
1. **Glob** - File pattern matching
2. **Grep** - Content search
3. **Read** - File reading
4. **Edit** - File modification
5. **Write** - File creation
6. **Bash** - System commands (last resort)

---

## 📝 File Writing Rules

### Markdown Files
```powershell
# Must use obsidian-markdown skill for .md files
Skill:obsidian-markdown
```

### Encoding Checklist
- [ ] UTF-8 with BOM or without BOM (both acceptable)
- [ ] No GBK/GB2312 encoding
- [ ] Chinese characters render correctly in terminal

### Path Handling
- Use forward slashes `/` in paths (even on Windows)
- Quote paths with spaces: `"path with spaces/file.txt"`
- Use absolute paths when possible

---

## 🔗 VPS Services

| Service | URL | Purpose |
|---------|-----|---------|
| SearXNG | http://159.75.92.235:8080/ | Privacy search |
| IT-Tools | http://159.75.92.235:8081/ | Developer tools |
| Uptime Kuma | http://159.75.92.235:3001/ | Service monitoring |
| MinIO | http://159.75.92.235:9001/ | Object storage |

### SSH Connection
```powershell
ssh -i ~/.ssh/openclaw.pem ubuntu@159.75.92.235
```

**Key Location:** `~/.ssh/id_ed25519_openclaw` or `~/.ssh/openclaw.pem`

---

## 🗄️ MCP Server Priority

**Jarvis System MCPs:**
1. **Supabase** - Database, RAG, vector search
2. **Photo** - Unsplash image search
3. **Playwright** - Browser automation

**Usage Rule:** Enable < 10 MCPs per session to preserve context window.

---

## 🔄 Agent Communication

### Jarvis → JarvisClaw (VPS Agent)

**Workflow:**
1. SSH to VPS
2. Send task via `openclaw agent --agent main --message "task"`
3. JarvisClaw executes autonomously
4. Return results

**Key Difference:**
- **Jarvis (local):** Step-by-step execution, needs guidance
- **JarvisClaw (VPS):** Task-oriented, self-solves problems

**Principle:** Give JarvisClaw goal and requirements only, not detailed steps.

---

## ⚡ Quick Commands Reference

### Node.js Scripts (推荐 - 跨平台)

```bash
# 获取时间
node scripts/time.js

# 获取日期
node scripts/date.js

# 获取完整时间戳
node scripts/datetime.js

# 模式路由 CLI
node scripts/mode.js status
node scripts/mode.js switch dev
node scripts/mode.js list
```

### PowerShell (Windows 备用)

```powershell
# List files (no find)
Get-ChildItem -Path "./" -Filter "*.md" -Recurse

# Search content (no grep)
Select-String -Path "CLAUDE.md" -Pattern "pattern"

# Check file exists
Test-Path "file.txt"

# Read file content
Get-Content "file.txt" -Raw
```

---

> **Related:** [02-communication.md](./02-communication.md) | [04-user-context.md](./04-user-context.md)
