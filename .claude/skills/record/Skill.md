---
name: record
description: |
  Core memory persistence tool - ALWAYS use when ANY skill needs to save data to scratchpad.md, when user says "/record" or "记录一下", or when conversation progress needs to be logged.

  **执行模式选择：**
  - 快速模式（默认）：简单对话摘要，主对话直接执行，不走 subagent
  - 完整模式：需要 kanban 同步、主题分析时，调用 record-agent subagent
version: v8.2
last_updated: 2026-03-20
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)

# 记录 Skill v8.0 - 双模式优化

**核心优化**：减少 90% 简单记录的上下文消耗

---

## 双模式架构

```
用户触发记录
    ↓
判断复杂度
    ↓
┌─────────────┴─────────────┐
│                           │
快速模式                    完整模式
(简单摘要)                  (复杂场景)
    ↓                           ↓
主对话直接执行              record-agent subagent
    ↓                           ↓
Read scratchpad             读取 + 分析 + 生成指令
定位插入点                      ↓
直接 Edit                   主对话执行 Edit
    ↓                           ↓
~200 tokens                 ~2000 tokens
```

---

## ⚡ 快速模式（默认）

**适用场景**：
- 简单的对话摘要（1-2句话）
- 不需要 kanban 同步
- 不需要主题分析

**执行流程**：

### Step 1: 获取时间
```bash
powershell -Command "Get-Date -Format 'HH:mm'"
```

### Step 2: 判断内容来源

**情况A - 有明确内容**（用户说"/record 今天完成了XX"）：
```
直接使用用户提供的 content
```

**情况B - 无明确内容**（用户说"/record"或"记录一下"）：
```
content = null，表示使用对话上下文
→ 从当前对话历史中提取刚才讨论的主题和结果
→ 生成1-2句话的对话摘要
```

### Step 3: 读取 scratchpad（仅读取，不污染上下文）

读取"今日对话摘要"区域（头部）和"归档摘要区"起始位置：

```javascript
Read({
  file_path: "记忆库/L0_工作区/scratchpad.md",
  limit: 50,  // 读取头部区域
})
```

### Step 4: 定位并执行 Edit

**Scratchpad 结构（v5.2+）：**
```
## 今日对话摘要      ← 新记录追加到这里（最新一天）
## 归档摘要区        ← 前几天的对话摘要
  ### 2026-03-19
  ### 2026-03-18
  ...
```

在"今日对话摘要"区域的 `（今天的对话记录，待填充）` 之后插入新条目：

```json
{
  "file_path": "记忆库/L0_工作区/scratchpad.md",
  "old_string": "## 今日对话摘要\n\n（今天的对话记录，待填充）\n\n---\n\n## 归档摘要区",
  "new_string": "## 今日对话摘要\n\n（今天的对话记录，待填充）\n\n1. **【对话摘要】简短描述**\n   - 时间：HH:mm\n   - 动作：具体内容\n   - 结果：达成的结果\n\n---\n\n## 归档摘要区"
}

### Step 5: 确认记录
```
✅ 已记录到 scratchpad
```

---

## 🔍 完整模式（复杂场景）

**触发条件**（满足任一）：
- `kanban_action` 参数存在（需要同步 kanban）
- `mode: 洞察`（需要主题分析）
- `mode: 决策`（需要添加到决策表格）
- 用户明确要求"完整记录"

**执行流程**：同 v7.2，调用 record-agent subagent

---

## 模式选择决策树

```
记录请求
    ↓
有 kanban_action? ──Yes──→ 完整模式
    ↓ No
mode == "洞察"? ────Yes──→ 完整模式
    ↓ No
mode == "决策"? ────Yes──→ 完整模式
    ↓ No
内容 > 100字? ─────Yes──→ 完整模式（建议）
    ↓ No
快速模式（默认）
```

---

## 使用示例

### 示例 1: 无内容记录（使用对话上下文）
```
用户：记录一下
AI：✅ 已记录到 scratchpad
     → 从对话历史提取主题：UU远程黑屏问题分析
     → 生成摘要并追加到今日对话摘要
```

### 示例 2: 有内容快速记录
```
用户：记录一下，讨论了API方案
AI：✅ 已记录到 scratchpad
     → 使用用户提供的content
```

### 示例 3: 任务完成（完整模式）
```
用户：搞定了
AI：
  1. 判断为 task_completion
  2. kanban_action: move_to_done
  3. 触发完整模式 → subagent
  4. 同步更新 scratchpad + kanban
```

### 示例 4: 洞察记录（完整模式）
```
用户：我发现一个关键问题
AI：
  1. mode: 洞察
  2. 触发完整模式 → subagent
  3. 主题分析 + 质量判断 + 同步建议
```

---

## 性能对比

| 指标 | v7.2 (总是 subagent) | v8.0 (双模式) | 优化效果 |
|------|---------------------|---------------|----------|
| 简单记录 Token | ~2500 | ~300 | **-88%** |
| 简单记录耗时 | ~3s | ~0.5s | **-83%** |
| 复杂场景 Token | ~2500 | ~2500 | 持平 |
| 复杂度 | 中等 | 中等 | 可控 |

---

## 快速参考

### 快速模式代码模板

```javascript
// 1. 获取时间
const time = bash("powershell -Command 'Get-Date -Format HH:mm'")

// 2. 读取 scratchpad 尾部（limit 30行）
const tail = read("记忆库/L0_工作区/scratchpad.md", limit=30, offset=-30)

// 3. 找到最后一个条目
const lastEntry = extractLastEntry(tail)

// 4. 执行 Edit
edit({
  file_path: "记忆库/L0_工作区/scratchpad.md",
  old_string: lastEntry.text + "\n\n---",
  new_string: lastEntry.text +
    `\n\n${lastEntry.number + 1}. **【对话摘要】${content.substring(0, 20)}...**` +
    `\n   - 时间：${time}` +
    `\n   - 动作：${content}` +
    `\n   - 结果：待补充\n\n---`
})

// 5. 确认
say("✅ 已记录")

// 6. 更新记录时间戳（供 stop-hook / command-parser 确定分析边界）
bash(`node .claude/hooks/update-last-record.js "${content.substring(0, 30)}"`)
```

### 完整模式调用（同 v7.2）

```javascript
// 复杂场景才调用 subagent
Agent({
  prompt: "...",
  subagent_type: "record-agent"
})
```

---

## 注意事项

- ⚡ **默认使用快速模式**，减少上下文消耗
- 🔍 **自动判断复杂场景**，无缝切换到完整模式
- 📊 **保持 API 兼容**，其他 skills 调用方式不变
- 🧪 **回退机制**：快速模式失败时自动尝试完整模式

---

## Subagent 配置（完整模式用）

`.claude/agents/record-agent.md`:

```yaml
---
name: record-agent
description: 复杂场景记录 - 读取记忆文件，分析并生成写入指令
tools:
  - Read
  - Bash
maxTurns: 10
---

# Record Agent - 完整模式分析器

## 职责
1. 完整读取 scratchpad.md 和 kanban.md
2. 复杂分析（主题关联、质量判断、同步建议）
3. 生成精确的 Edit 指令
4. 返回 JSON 格式

## 触发场景
- kanban 同步
- 主题洞察分析
- 决策记录
- 复杂内容结构化
```
