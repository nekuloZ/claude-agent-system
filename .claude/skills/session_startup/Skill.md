---
name: session_startup
description: ALWAYS use at conversation start, when user greets with "早上好", "中午好", "晚上好", "hey jarvis", "hi jarvis", or says "继续工作"/"新的一天". Loads context progressively using memory_loader (L0→L1→L2→L3) with block-level wikilink resolution and generates personalized briefings. MUST trigger for any session initialization or warm-up scenario.
version: v5.2
last_updated: 2026-03-20
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)

# 会话启动 Skill

加载上下文，生成个性化简报。智能识别场景（同一天多会话 vs 新的一天首次对话），整合多源数据补充缺失上下文。

---

## 触发条件

1. **Hook 触发**：SessionStart 时自动调用
2. **用户触发**："早上好", "中午好", "晚上好", "hey jarvis", "hi jarvis", "继续工作", "新的一天"

---

## 执行流程

### Step 1: 获取时间

用 Bash 获取当前日期时间：
```bash
powershell -Command "Get-Date -Format 'yyyy-MM-dd'"
powershell -Command "Get-Date -Format 'HH:mm'"
```

### Step 2: 加载意图矩阵（检测用户意图）

用 Read 工具读取：`.claude/intent_matrix.json`

**匹配逻辑：**
- P0（紧急）："完成了", "搞定了" → 触发对应 skill，简报后置
- P1（状态）："昨晚X点睡", "今天洗澡了" → 触发 habit_tracker
- P2（规划）："要做XXX", "创建任务" → 触发 task/action manager
- P3（洞察）："我发现", "我决定" → 触发 theme_insight_tracker
- P4（系统）："复盘", "Archive" → 触发 daily_review_archiver

**如果有 P0 匹配，执行 skill 后停止。否则继续生成简报。**

### Step 3: 场景判断

读取 scratchpad 头部获取日期：
```bash
# 读取 scratchpad 前 20 行获取日期
Read({
  file_path: "记忆库/L0_工作区/scratchpad.md",
  limit: 20
})
```

**场景判断：**

| 场景 | 判断条件 | 加载策略 |
|------|---------|---------|
| **A. 同一日多会话** | scratchpad 日期 == 今天 | 只加载 L0（限制行数） |
| **B. 新的一天首次对话** | scratchpad 日期 < 今天 | L0 + **昨天日报 JSON** |
| **C. /clear 恢复** | .last_session.json date == 今天 | L0 + .last_session.json |

### Step 4: 分层加载

**Token 预算：**

| 阶段 | 内容 | Token 预算 |
|------|------|-----------|
| Stage 0 | L0 必载 | ~1500 |
| Stage 1 | 场景特定 | ~800 |
| Stage 2 | 双链预载 (每链接) | ~300 |
| Stage 3 | 按需深度 | 动态 |

**Stage 0 - L0 工作层（必载）：**

1. **scratchpad.md**（限制最后 100 行，约 500 tokens）
   ```javascript
   Read({
     file_path: "记忆库/L0_工作区/scratchpad.md",
     limit: 100,
     offset: -100
   })
   ```

2. **habit_data.json**（完整加载，约 2.2k tokens）
   ```javascript
   Read({
     file_path: "记忆库/L0_工作区/habit_data.json"
   })
   ```

3. **.current_task.json**（完整加载，约 400 tokens）
   ```javascript
   Read({
     file_path: "记忆库/L0_工作区/.current_task.json"
   })
   ```

4. **next_actions_kanban.md**（如需要）
   ```javascript
   Read({
     file_path: "记忆库/L0_工作区/next_actions_kanban.md"
   })
   ```

**Stage 1 - 场景 B 专用：昨天日报 JSON**

```javascript
// 计算昨天日期
yesterday = today - 1 day

// 尝试读取昨日日报 JSON
Read({
  file_path: "记忆库/L1_长期记忆/01-Daily/.data/{{yesterday}}.json"
})

// 如果文件不存在，提醒用户：
// "⚠️ 昨天的日报还没归档，需要先归档吗？"
```

**Stage 2 - 双链预加载（如有提及）：**

```
从 L0/L1 提取 [[wikilinks]]
├─ 文档链接 [[文档]] → 加载 frontmatter + 200字摘要
├─ 标题链接 [[文档#标题]] → 加载该标题下内容
└─ 块链接 [[文档#^块ID]] → 加载精确块 (±50字上下文)
```

**Stage 3 - 按需深度加载：**
- 用户追问时加载完整文档

---

### Step 5: 生成简报

**核心原则：秘书式简报，不是数据罗列**

❌ 不要做的事：
- 不要按固定模板填空
- 不要罗列"完成了A、B、C"
- 不要抛出问题让用户选（"搞A还是搞B？"）
- 不要复读数据没有洞察

✅ 要做的：
- 用1-2句话自然带出上下文
- 基于数据给出**建议**而非选择
- 发现**异常模式**时提醒（如：某任务卡很久、某项目没进展）
- 语气像熟人打招呼，不是机器人播报

---

## 助理模式输出格式

**不再是简报，而是助理汇报**。结构如下：

```
[问候 + 状态一句话]

[今日焦点]
→ 建议优先处理：XXX
→ 预计耗时：X分钟/X小时
→ 下一步具体动作：XXX

[其他待办]
- 任务A（状态）
- 任务B（状态）

[如需其他支持]
直接告诉我需要查什么、整理什么。
```

---

**场景示例：**

**场景 A - 同一日多会话（/clear 后）：**
```
下午好，刚聊到 Seedance API 的认证问题。

→ 建议继续：检查 API Key 权限配置
→ 下一步：用 curl 测试一下接口通不通

还有其他需要我同步的吗？
```

**场景 B - 新的一天首次对话：**
```
早上好，昨晚 8 小时，状态应该在线。

【今日焦点】
昨天把 session_startup 和 OpenClaw 都收尾了，进度不错。
→ 建议优先：Seedance 视频测试（上班族迟到 12 镜）
→ 预计：1-2 小时可以出第一批视频
→ 下一步：确认分镜脚本，然后批量生成

【其他待办】
- Seedance2.0 Web 应用（搭建中，不急）
- 接入 Seedance 2.0 API（还在等官方开放）

需要我先帮你准备什么材料吗？
```

**场景 B+ - 昨天未归档提醒：**
```
早上好，睡了 8 小时状态不错。

⚠️ 昨天（2026-03-19）的日报还没归档，需要先归档吗？

【今日焦点】
...
```

**场景 C - 跨天任务延续：**
```
早上好。

【断点提醒】
Seedance2.0 上次卡在视频接口对接，API 文档还没看完。

→ 今天建议：先把文档过一遍
→ 预计：30 分钟
→ 好处：比开新任务的心智成本低，看完就能判断要不要调整方案

【状态】
- 昨晚睡眠：8h
- 活跃任务：3个（1个卡了7天，建议优先处理或放一放）

想继续这个，还是先处理别的？
```

---

**助理风格要点：**

| 要素 | 说明 |
|------|------|
| **主动汇报** | 不是问用户要干嘛，而是告诉用户今天建议干嘛 |
| **具体下一步** | 不只是说任务名，要说具体动作（"检查API Key" vs "搞Seedance"） |
| **预计耗时** | 帮助用户做时间规划 |
| **理由说明** | 为什么建议这个（状态好/卡很久/心智成本低） |
| **提供支持** | 结尾留一个开放的"要我做什么"，体现助理价值 |
| **信息分层** | 焦点 → 待办 → 支持，不要混成一团 |

---

**输出控制：**
- 总长度：**5-8 行**（结构化，不是大段文字）
- 必须包含：**建议做什么 + 下一步具体动作 + 预计耗时**
- 语气：专业助理，不是闲聊
- 结尾：**主动询问还需要什么支持**

---

## 数据源优先级表

| 场景 | 已做事项来源 | 待办来源 | 特殊处理 |
|------|-------------|---------|---------|
| 同一日多会话 | scratchpad「今日对话摘要」 | scratchpad「未闭环」+ kanban | 限制 scratchpad 100行 |
| 新的一天首次对话 | `01-Daily/.data/昨天.json` | 日报 `uncompleted_tasks` + kanban | 需读取昨天日期文件 |
| 跨天任务延续 | `02-Projects/项目.md`「最新进展」 | .current_task.json | 标记为「延续」而非「新开始」 |

### 路径映射（v5.0）

| 内容 | 路径 |
|------|------|
| 日报 | `L1_长期记忆/01-Daily/YYYY-MM-DD.md` |
| 日报JSON | `L1_长期记忆/01-Daily/.data/YYYY-MM-DD.json` |
| 项目 | `L1_长期记忆/02-Projects/{{项目名}}.md` |
| 关系 | `L1_长期记忆/03-Relationships/{{人名}}.md` |
| 主题 | `L3_用户档案/02-Themes/{{主题名}}.md` |

---

## 关键原则

1. **意图优先** - 用户说任务指令，先执行意图，简报后置
2. **场景驱动** - 根据会话场景选择正确的数据源
3. **跨天衔接** - 新的一天要基于昨天日报，而不是 scratchpad（那是旧数据）
4. **简洁自然** - 简报像聊天，不罗列数据
5. **Token 控制** - scratchpad 限制 100 行，避免上下文膨胀

---

## 禁止

- ❌ 不判断场景就用 scratchpad 作为「今天已做」（新的一天可能是昨天数据）
- ❌ 不读核心文件就直接问候
- ❌ 不问数据就猜测用户状态
- ❌ 简报过长（超过4句话）
- ❌ 加载完整 scratchpad（7天内容约 6-8k tokens，太高）

---

## 快捷检查

生成简报前确认：

**结构检查：**
1. [ ] 简报只有 2-3 句话？（不是4段式）
2. [ ] 没有罗列「完成了A、B、C」？（用一句话概括）
3. [ ] 给出的是**建议**而非选择？（不是「搞A还是搞B？」）
4. [ ] 包含洞察或判断？（不只是复读数据）

**场景检查：**
5. [ ] 判断了正确的会话场景？
6. [ ] 场景B读取了昨天日报 JSON？
7. [ ] 昨天日报不存在时提醒用户归档？
8. [ ] scratchpad 限制了行数（100行）？

**语气检查：**
9. [ ] 像熟人打招呼，不是系统通知？
10. [ ] 最多提1-2个任务，不是全列出来？
