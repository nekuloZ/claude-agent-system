---
name: mode-switcher
description: ALWAYS use when user inputs a slash command like /dev, /learn, /ops, /assist, /auto, /mode, /compress, or mode switching keywords like "切换模式".
trigger:
  - /dev
  - /learn
  - /ops
  - /assist
  - /auto
  - /mode
  - /compress
  - "切换到开发模式"
  - "切换到学习模式"
  - "切换到运营模式"
  - "切换到助手模式"
  - "切换到自动模式"
version: "2.0"
---

# Mode Switcher Skill

## 职责

处理模式切换和斜杠命令，管理 Jarvis 的工作模式。

## 流程

### 1. 检测斜杠命令

```javascript
// 支持的命令
/dev     -> 开发模式
/learn   -> 学习模式
/ops     -> 运营模式
/assist  -> 助手模式
/auto    -> 自动模式
/mode    -> 显示当前模式
/compress -> 手动压缩上下文
```

### 2. 执行模式切换

```bash
node .claude/mode-system/router.js switch <mode>
```

### 3. 加载模式上下文

```bash
node .claude/mode-system/router.js preload <mode>
```

### 4. 读取模式规则文件

**重要：** 切换模式后必须显式读取对应的规则文件。

```javascript
// 规则文件路径
const ruleFile = `.claude/rules/modes/${mode}-mode.md`;

// 使用 Read 工具读取
Read({ file_path: ruleFile });
```

规则文件包含：
- 模式特定的行为准则
- 技能使用规范
- 编码标准（dev 模式）
- 数据处理规范（ops 模式）
- 学习方法（learn 模式）

### 5. 显示切换报告

输出格式化的模式切换报告，包括：
- 模式名称和角色
- 已激活技能
- 上下文预算
- 模式特定提示

## 实现

```javascript
const modeRouter = require('.claude/mode-system/router.js');
const fs = require('fs');

// 处理用户输入
function handleModeSwitch(userInput) {
  const result = modeRouter.handleSlashCommand(userInput);

  if (result.handled) {
    if (result.success) {
      // 显示切换报告
      console.log(result.message);

      // 获取预加载文件
      const files = modeRouter.getPreloadFiles(result.mode);

      // === 读取模式规则文件 ===
      const ruleFile = `.claude/rules/modes/${result.mode}-mode.md`;
      let ruleContent = null;

      try {
        if (fs.existsSync(ruleFile)) {
          ruleContent = fs.readFileSync(ruleFile, 'utf-8');
          console.log(`✓ 已加载规则: ${ruleFile}`);
        } else {
          console.log(`⚠ 规则文件不存在: ${ruleFile}`);
        }
      } catch (e) {
        console.error(`✗ 读取规则失败: ${e.message}`);
      }

      return {
        mode: result.mode,
        skills: result.config.skills,
        preloadFiles: files,
        systemPromptAdditions: result.config.systemPromptAdditions,
        ruleFile: ruleFile,
        ruleContent: ruleContent
      };
    } else {
      console.error(result.error);
    }
  }

  return null;
}
```

## 集成

在 `PostToolUse` Hook 中自动调用，或在对话开始时检查。

## 示例输出

### 模式切换示例

**用户输入：** `/dev`

**执行流程：**
```
1. node .claude/mode-system/router.js switch dev
2. node .claude/mode-system/router.js preload dev
3. Read .claude/rules/modes/dev-mode.md
```

**输出：**
```markdown
╔══════════════════════════════════════════════════════════╗
║  🔧 切换到【开发模式】- 全栈工程师                       ║
╠══════════════════════════════════════════════════════════╣
║ 描述: 专注于代码编写、架构设计、代码审查                 ║
╠══════════════════════════════════════════════════════════╣
║ 已激活技能:                                               ║
║   • planning-with-files                                   ║
║   • executing-plans                                       ║
║   • requesting-code-review                                ║
║   ... 还有 6 个技能                                       ║
╠══════════════════════════════════════════════════════════╣
║ 上下文预算: 40% (80000 tokens)                            ║
╠══════════════════════════════════════════════════════════╣
║ ✅ 已加载规则: rules/modes/dev-mode.md                    ║
║    - TypeScript/Python 编码规范                           ║
║    - TDD 开发流程                                         ║
║    - 代码审查标准                                         ║
╠══════════════════════════════════════════════════════════╣
║ 💡 提示:                                                  ║
║   使用 /plan 创建实施计划                                 ║
║   使用 /review 请求代码审查                               ║
╚══════════════════════════════════════════════════════════╝
```

---

## 上下文压缩

当上下文使用超过阈值时：

```bash
node .claude/hooks/context-compression.js check --verbose
```

**规则文件可被压缩：** 如果规则文件内容占用过多上下文，context-compression 会建议将其归档，只保留关键摘要。
