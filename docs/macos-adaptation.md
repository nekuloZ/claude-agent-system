# macOS 适配文档
_最后更新：2026-03-20_

本文档提供给同事的 Claude Code agent，用于自动处理 Windows 到 macOS 的平台差异。

---

## 1. 核心差异对照表

### 1.1 时间命令

| Windows (PowerShell) | macOS (bash) | 说明 |
|---------------------|--------------|------|
| `powershell -Command "Get-Date -Format yyyy-MM-dd"` | `date "+%Y-%m-%d"` | 获取日期 |
| `powershell -Command "Get-Date -Format HH:mm"` | `date "+%H:%M"` | 获取时间 |
| `powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"` | `date "+%Y-%m-%d %H:%M:%S"` | 完整时间戳 |

**推荐方案**：使用 Node.js 脚本（跨平台）
```javascript
// scripts/time.js
const now = new Date();
console.log(now.toISOString());
```

### 1.2 路径分隔符

| Windows | macOS | 说明 |
|---------|-------|------|
| `\` (反斜杠) | `/` (正斜杠) | 路径分隔符 |
| `C:\Users\name` | `/Users/name` | 用户目录 |
| `%USERPROFILE%` | `$HOME` | 环境变量 |

**统一方案**：始终使用正斜杠 `/`，Node.js 和 Git Bash 在 Windows 上都支持。

### 1.3 环境变量

| Windows | macOS | 说明 |
|---------|-------|------|
| `%USERNAME%` | `$USER` | 用户名 |
| `%USERPROFILE%` | `$HOME` | 用户主目录 |
| `%APPDATA%` | `$HOME/Library/Application Support` | 应用数据 |
| `set VAR=value` | `export VAR=value` | 设置环境变量 |

### 1.4 文件操作命令

| Windows (PowerShell) | macOS (bash) | 说明 |
|---------------------|--------------|------|
| `Get-Content file.txt` | `cat file.txt` | 读取文件 |
| `Set-Content file.txt "text"` | `echo "text" > file.txt` | 写入文件 |
| `Test-Path file.txt` | `[ -f file.txt ]` | 检查文件存在 |
| `New-Item -ItemType Directory` | `mkdir` | 创建目录 |
| `Copy-Item src dst` | `cp src dst` | 复制文件 |
| `Remove-Item path` | `rm path` | 删除文件 |

---

## 2. Hooks 脚本跨平台方案

### 2.1 推荐：Node.js 实现

Hooks 脚本统一使用 Node.js 编写，彻底跨平台：

```javascript
// 示例：获取当前日期
const fs = require('fs');
const path = require('path');

// 跨平台路径处理
const memoryDir = path.join(process.cwd(), '记忆库', 'L0_工作区');

// 跨平台时间获取
const now = new Date();
const dateStr = now.toISOString().split('T')[0];

// 跨平台文件操作
fs.writeFileSync(path.join(memoryDir, 'last_update.txt'), dateStr);
```

### 2.2 条件编译（如必须用 Shell）

```javascript
const { execSync } = require('child_process');
const isWindows = process.platform === 'win32';

const command = isWindows
  ? 'powershell -Command "Get-Date -Format yyyy-MM-dd"'
  : 'date "+%Y-%m-%d"';

const result = execSync(command, { encoding: 'utf8' }).trim();
```

---

## 3. 配置适配

### 3.1 settings.json 无需修改

settings.json 中的命令使用 Node.js，已在所有平台工作：
```json
{
  "command": "node .claude/hooks/command-parser.js"
}
```

### 3.2 Skills 路径已统一

所有 Skills 中的路径已替换为中文 `记忆库/` 格式，不依赖平台。

---

## 4. 初始化检查清单（macOS）

```markdown
- [ ] Homebrew 已安装（推荐）
- [ ] Node.js 18+ 已安装 (`brew install node`)
- [ ] Git 已安装 (`brew install git`)
- [ ] Claude Code CLI 已安装 (`npm install -g @anthropic-ai/claude-code`)
- [ ] 全局 Skills 目录存在 (`ls ~/.claude/skills/`)
- [ ] UTF-8 终端编码 (`export LANG=zh_CN.UTF-8`)
```

---

## 5. 常见问题

### 5.1 中文显示乱码

```bash
# 在 ~/.zshrc 或 ~/.bash_profile 中添加
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
```

### 5.2 权限问题

```bash
# 给 Hooks 脚本执行权限
chmod +x .claude/hooks/*.js
```

### 5.3 路径问题

如果遇到路径相关错误，检查：
1. 是否使用了正斜杠 `/`
2. 中文目录名是否正确（`记忆库/`）
3. 环境变量是否正确展开

---

## 6. 快速修复脚本

```bash
#!/bin/bash
# macOS-setup.sh - 由 agent 自动执行

echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    brew install node
fi

echo "检查 UTF-8 编码..."
export LANG=zh_CN.UTF-8

echo "创建记忆库目录..."
mkdir -p 记忆库/L0_工作区
mkdir -p 记忆库/L1_长期记忆
mkdir -p 记忆库/L2_知识库
mkdir -p 记忆库/L3_用户档案

echo "macOS 适配完成！"
```

---

<!-- AI-TODO: 根据同事的实际平台，自动应用对应配置 -->
