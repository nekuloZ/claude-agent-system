---
name: daily_review_archiver
description: This skill should be used when the user says "复盘", "Archive", "总结今天" to archive daily activities to L1_长期记忆/01-Daily/. Includes optional RAG indexing for high-value content.
version: v3.5
last_updated: 2026-03-20
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)
> **模式归属:** 🤖 assist (助手模式)
> **斜杠命令:** `/archive`

# 日归档 Skill

将 L0 Working Memory 归档到 L1 Episodic Memory。

---

## ⚠️ 关键规则（不可违背）

1. **必须先展示计划，等用户说"确认"才能执行**
2. **必须记录到 scratchpad.md（调用 record skill）**
3. **必须同步到向量数据库（如有）**

---

## 触发词

- "复盘"
- "Archive"
- "总结今天"
- "昨晚没复盘"

---

## 执行流程

### Step 1: 读取数据

用 Read 工具读取：
- `记忆库/L0_工作区/scratchpad.md`
- `记忆库/L0_工作区/habit_data.json`
- `记忆库/L0_工作区/next_actions_kanban.md`
- `记忆库/L0_工作区/.current_task.json`

### Step 2: 展示计划（等确认）

**格式：**
```
📋 归档计划确认

【日期】YYYY-MM-DD（周X）
【时间】现在 HH:MM

【昨日产出】
- 项目A：完成了XXX
- 项目B：推进了YYY

【待办状态】
- ✅ 已完成：任务X
- 🔄 未完成：任务Y（保留）

【习惯数据】
- 睡眠：XX:XX - XX:XX（X小时）

确认执行吗？（回复"确认"）
```

**必须等用户说"确认"才能继续！**

### Step 3: 执行归档（用户确认后）

1. **生成 Daily Log**（Markdown）
   - 路径：`记忆库/L1_长期记忆/01-Daily/YYYY-MM-DD.md`
   - 包含：发现、决策、项目进展、数据

   **创建方式：**
   - **方式一（推荐）**：使用 Write 工具直接写文件
   - **方式二（Obsidian 运行时）**：使用 CLI
     ```bash
     obsidian create path="记忆库/L1_长期记忆/01-Daily/YYYY-MM-DD.md" content="..."
     ```

2. **生成 JSON**（数据分析用）
   - 路径：`记忆库/L1_长期记忆/01-Daily/.data/YYYY-MM-DD.json`

3. **新发现检测与 L2 沉淀（新增）**

   分析 scratchpad 内容，自动识别并创建 L2 知识条目：

   **检测规则：**
   ```python
   discovery_rules = [
       {
           "type": "ai-model",
           "name": "AI模型",
           "patterns": [
               r"(\w+[\s\-]?\d+\.?\d*).{0,30}(发布|上线|推出|更新)",
               r"(Claude|GPT|Gemini|MiniMax|Qwen|Kling|Seedance).{0,50}(新功能|新模型|版本)"
           ],
           "target_dir": "L2_知识库/knowledge/ai-models/",
           "template": "ai-model-template.md"
       },
       {
           "type": "tool",
           "name": "工具",
           "patterns": [
               r"用了?(.+?)(工具|软件|平台)",
               r"发现.{0,20}(工具|软件|平台)(.+?)(?=
|$)"
           ],
           "target_dir": "L2_知识库/knowledge/tools/",
           "template": "tool-template.md"
       },
       {
           "type": "pattern",
           "name": "模式",
           "patterns": [
               r"模式[是|:](.+?)(?=
|$)",
               r"规律[是|:](.+?)(?=
|$)"
           ],
           "target_dir": "L2_知识库/knowledge/patterns/",
           "template": "pattern-template.md"
       }
   ]
   ```

   **执行流程：**
   - 扫描 scratchpad 的「今日对话摘要」和「核心洞察」
   - 匹配 patterns，提取实体名称
   - 检查 L2 目录是否已存在
   - 不存在 → 创建新条目 + 在 Daily Log 中添加 `[[条目名]]` 链接
   - 存在 → 可选更新（询问用户）

   **示例输出：**
   ```
   🔍 新发现检测

   [1] AI模型 - MiniMax M2.7
       状态：新发现，将创建 L2 条目
       Daily 链接：[[minimax|MiniMax M2.7 发布]]

   [2] 工具 - Obsidian Web Clipper
       状态：已存在，跳过

   创建 1 个新 L2 知识条目
   ```

4. **更新文件**
   - `.current_task.json`：day_count +1，清空 completed_today
   - `next_actions_kanban.md`：迁移已完成任务，更新日期
   - `habit_data.json`：today → history，清空 today

5. **标记 scratchpad**
   - **更新头部日期**：将 scratchpad.md 头部的 `| **日期** |` 改为归档日期（YYYY-MM-DD）
   - **更新 week 字段**：将 `| **周** |` 改为正确的周号（YYYY-Www）
   - **移动对话摘要到归档区**：将"今日对话摘要"内容移到"归档摘要区"下方的日期标题下
   - **清空今日对话摘要**：将"今日对话摘要"内容恢复为"（今天的对话记录，待填充）"

   **执行方式：**
   ```
   old_string: "## 今日对话摘要\n\n1. **【xxx】...\n...\n\n---\n\n## 归档摘要区\n\n### YYYY-MM-DD"
   new_string: "## 今日对话摘要\n\n（今天的对话记录，待填充）\n\n---\n\n## 归档摘要区\n\n### YYYY-MM-DD\n\n1. **【xxx】...\n..."
   ```

6. **同步向量库**（旧版兼容）
   - 如需全文索引：调用 `python tools/memory_search/process_logs.py --file ...`

7. **调用 record skill（显式联动）**

   使用 Skill 工具显式调用 record，确保归档信息被记录：

   ```python
   Skill({
     skill: "record",
     args: "--mode skill结果 --skill daily_review_archiver --content '日复盘完成：YYYY-MM-DD，归档到 L1_长期记忆/01-Daily/'"
   })
   ```

### Step 4: RAG索引提取（可选）

**分析当日内容，提取高价值片段供用户确认：**

```python
# 提取规则
extraction_rules = [
    {
        "type": "decision",
        "name": "项目决策",
        "patterns": [
            r"决定[用|采用|选择](.+?)[，|因为|，原因是](.+?)(?=\n|$)",
            r"放弃(.+?)方案[，|改为](.+?)(?=\n|$)",
            r"改用(.+?)绕过(.+?)(?=\n|$)"
        ]
    },
    {
        "type": "insight",
        "name": "主题洞察",
        "patterns": [
            r"我发现(.+?)(?=\n|$)",
            r"原来(.+?)(?=\n|$)",
            r"意识到(.+?)(?=\n|$)"
        ]
    },
    {
        "type": "problem",
        "name": "问题方案",
        "patterns": [
            r"(.+?)问题.+?(解决|搞定|通过)(.+?)(?=\n|$)",
            r"卡了.+?发现(.+?)(?=\n|$)",
            r"(.+?)的坑[是|在](.+?)(?=\n|$)"
        ]
    },
    {
        "type": "commitment",
        "name": "人际约定",
        "patterns": [
            r"(答应|跟|和)(.+?)(说|约定|承诺)(.+?)(?=\n|$)"
        ]
    }
]
```

**展示格式：**
```
══════════════════════════════════════════════════
RAG索引候选（可选）
══════════════════════════════════════════════════

[1] 项目决策 - Seedance
    内容: 改用Web方案绕过API限制...
    [Y/n]

[2] 主题洞察 - 克服拖延
    内容: 拖延根源是完美主义恐惧...
    [Y/n]

[3] 技术方案 - MCP配置
    内容: headers需加version字段...
    [Y/n]

输入要跳过的编号(如: 2)，或回车全部确认，或输入"跳过"：
```

**用户确认后执行存储：**
```bash
# 批量存储
python tools/memory_search/store_to_rag.py --batch /tmp/rag_items.json

# 或单条存储
python tools/memory_search/store_to_rag.py \
  --content "改用Web方案绕过API限制" \
  --type decision \
  --domain "Seedance" \
  --context "官方API未开放，决定先绕过" \
  --date "2026-03-16" \
  --source "L1_长期记忆/01-Daily/2026-03-16.md"
```

**存储后输出：**
```
[存储结果]
✓ 项目决策 → projects/Seedance
✓ 主题洞察 → themes/克服拖延
✓ 技术方案 → reference/MCP

共 3 条内容已建立RAG索引
```

---

## 输出格式

### Daily Log 模板

```markdown
---
type: daily_log
title: "YYYY年MM月DD日 | 周X"
date: YYYY-MM-DD
weekday: "周X"
---

## 今天你发现了什么
（从scratchpad提取洞察）

## 今天你决定了什么
（从scratchpad提取决策）

## 新发现 🔗
（自动创建 L2 知识条目并双链）
- [[minimax|MiniMax M2.7 发布]] - 自我进化代码模型
- [[obsidian-web-clipper|Obsidian Web Clipper]] - 网页剪藏工具

## 项目进展
- [[项目名]]：具体进展

## 今日数据
| 指标 | 数值 |
|------|------|
| 睡眠 | X小时 |
| 精力 | 充沛/一般/疲惫 |
```

---

## 禁止事项

- ❌ 不等确认就执行
- ❌ 不写 scratchpad
- ❌ 不同步向量库
- ❌ 删除 scratchpad 内容（只追加标记）

---

## 快捷检查

完成前问自己：
1. 用户说"确认"了吗？
2. 记录到 scratchpad 了吗？
3. 向量库同步了吗？
