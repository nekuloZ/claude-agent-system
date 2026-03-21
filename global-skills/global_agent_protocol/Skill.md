---
name: global_agent_protocol
description: 跨Agent统一协议 - 所有Jarvis系统Agent必须遵循的全局规范，确保数据格式一致、同步机制统一、行为模式可共享
version: v1.0
last_updated: 2026-02-03
scope: global
---

# Global Agent Protocol v1.0

## 🎯 核心原则

**所有 Agent 必须遵循的契约：**
1. **数据格式统一** - 使用相同的 JSON Schema 和 Markdown 格式
2. **同步机制标准** - 通过 Supabase 进行实时状态同步
3. **用户身份一致** - 所有操作关联到同一个 user_id
4. **行为模式共享** - 分析结果写入共享存储，所有 Agent 可读

---

## 📁 强制文件路径（所有Agent相同）

```
jarvis-memory/
├── L0_Working/
│   ├── scratchpad.md              # 本地会话记录
│   ├── .current_task.json         # 当前任务状态（本地缓存）
│   ├── .last_session.json         # 上次会话摘要
│   ├── next_actions_kanban.md     # 待办看板
│   └── habit_data.json            # 习惯数据
├── L1_Episodic/
│   ├── Projects/                  # 项目文件
│   ├── insight_index.json         # 洞察索引（全局共享）
│   └── .sync/                     # 同步状态标记
├── L2_Procedural/
│   └── reference/
│       └── agent_sync_protocol.md # 本协议文档
└── .claude/
    └── skills/
        └── global_agent_protocol/ # 本skill
```

---

## 🔄 强制同步点（所有Agent必须执行）

### 同步触发时机

| 时机 | 操作 | 优先级 |
|-----|------|--------|
| 会话启动 | 读取 Supabase 获取其他 Agent 状态 | P0 - 阻塞 |
| 任务开始 | 写入 Supabase 标记 active | P0 - 阻塞 |
| 任务进展 | 每10分钟或对话结束时更新 | P1 - 异步 |
| 任务完成 | 写入历史记录，标记 completed | P0 - 阻塞 |
| 会话结束 | 更新最后活跃时间 | P1 - 异步 |

### 同步失败处理

```python
if sync_failed:
    # 1. 本地记录到待同步队列
    queue_for_retry(data)

    # 2. 继续服务用户（不阻塞）
    continue_operation()

    # 3. 下次启动时重试同步
    on_next_startup_retry_sync()
```

---

## 📊 统一数据格式

### 1. 任务进度格式（所有Agent必须一致）

**Supabase 表: `agent_task_progress`**

```json
{
  "id": "uuid",
  "agent_id": "ai_short_video|jarvis_system|default",
  "user_id": "从 L4_Identity/user_profile.json 读取",
  "task_name": "场景提炼 + 变量化",
  "project": "AI短视频",
  "status": "idle|active|paused|completed",

  "started_at": "2026-02-03T09:00:00Z",
  "last_active_at": "2026-02-03T10:30:00Z",
  "total_duration_seconds": 5400,

  "progress_note": "试了3版提示词，整理了场景分类",
  "blocker": "场景真实度不够，需要参考素材",
  "next_action": "收集5-10个真实场景视频",

  "session_id": "当前Claude会话ID",
  "updated_at": "2026-02-03T10:30:00Z"
}
```

### 2. 本地缓存格式（.current_task.json）

```json
{
  "schema_version": "1.0",
  "agent_id": "ai_short_video",
  "user_id": "nekulo",
  "date": "2026-02-03",
  "sync_status": "synced|pending|failed",
  "last_sync_at": "2026-02-03T10:30:00Z",

  "active_task": {
    "name": "场景提炼 + 变量化",
    "project": "AI短视频",
    "status": "active",
    "started_at": "09:00",
    "total_minutes": 90,
    "sessions": [
      {"start": "09:00", "end": "09:45", "duration": 45, "note": "整理场景分类"},
      {"start": "10:00", "end": "10:30", "duration": 30, "note": "试了提示词"}
    ]
  },

  "pending_sync": []
}
```

### 3. 会话记录格式（scratchpad.md）

```markdown
### 10:30 [任务进展] AI短视频-场景变量化
持续时间：30分钟
动作：试了3版提示词
卡点：场景真实度不够
同步状态：✓ 已同步到 Supabase

### 10:35 [跨Agent通知]
来源：Jarvis系统 Agent
内容：用户开始处理Boss直聘招聘任务
建议：当前AI短视频任务已暂停90分钟，是否需要交接？
```

---

## 🤖 Agent 身份识别

### 如何确定 agent_id

**优先级顺序：**
1. 从 `.claude/skills/global_agent_protocol/config.json` 读取 `agent_id`
2. 从项目目录名推断（如 `jarvis-memory/` → `jarvis_system`）
3. 默认为 `"default"`

### config.json 格式

```json
{
  "agent_id": "ai_short_video",
  "agent_name": "AI短视频助手",
  "user_id": "nekulo",
  "supabase": {
    "project_url": "https://xxxx.supabase.co",
    "anon_key": "sb_publishable_xxx"
  },
  "sync_interval_seconds": 600
}
```

---

## 📋 简报生成规范（所有Agent统一）

### 必须包含的信息

```python
def generate_briefing():
    # 1. 本Agent昨日进展
    my_progress = get_my_progress()

    # 2. 其他Agent昨日进展（关键！）
    other_agents = get_other_agents_progress()

    # 3. 全局时间统计
    total_time = sum(a.time for a in all_agents)

    # 4. 冲突检测
    conflicts = detect_conflicts(my_progress, other_agents)

    return f"""
    早上好。昨晚睡了{X}小时，预测精力{Y}。

    【你的昨日】
    在我的领域（AI短视频）上花了{my_progress.time}分钟，
    卡在：{my_progress.blocker}

    【其他Agent动态】
    {other_agents[0].name}：处理了{other_agents[0].task}，{other_agents[0].status}

    【全局视角】
    昨日总工作时间：{total_time}分钟
    {conflicts.warning if conflicts else ''}

    【建议】
    基于行为模式，建议今天...
    """
```

---

## 🔧 工具函数（所有Agent必须实现）

### 必须提供的标准函数

```python
# ====== 同步相关 ======

def sync_task_start(task_name: str, project: str) -> dict:
    """
    标记任务开始，同步到Supabase
    返回: {"success": bool, "conflict_with": str|None}
    """
    pass

def sync_task_progress(note: str, blocker: str = None) -> bool:
    """
    更新任务进展
    """
    pass

def sync_task_end(completed: bool = False) -> dict:
    """
    标记任务结束/暂停
    返回: {"total_time": int, "sessions": list}
    """
    pass

def get_other_agents_status() -> list:
    """
    获取其他Agent的当前状态
    返回: [{"agent_id": str, "task": str, "status": str, "duration": int}]
    """
    pass

# ====== 行为模式相关 ======

def get_shared_behavior_patterns() -> dict:
    """
    从Supabase读取共享的行为模式分析
    """
    pass

def update_behavior_pattern(pattern_type: str, data: dict) -> bool:
    """
    更新行为模式（所有Agent可见）
    """
    pass

# ====== 简报相关 ======

def generate_global_briefing() -> str:
    """
    生成包含多Agent状态的简报
    """
    pass
```

---

## ⚠️ 强制规则

### 1. 数据一致性
- ❌ 禁止直接修改其他 Agent 的任务状态（只读）
- ✅ 只能通过 `cross_agent_sync` 表发送协作请求

### 2. 身份识别
- ❌ 禁止在没有 `user_id` 的情况下操作
- ✅ 每次启动必须验证 user_id 一致性

### 3. 失败处理
- ❌ 禁止同步失败时停止服务
- ✅ 必须本地缓存，异步重试

### 4. 时间记录
- ❌ 禁止估算时间（"大概30分钟"）
- ✅ 必须记录实际起止时间戳

---

## 🔌 接入检查清单

新 Agent 接入时必须确认：

- [ ] 创建了 `config.json` 并设置正确的 `agent_id`
- [ ] 实现了所有标准同步函数
- [ ] 测试了与 Supabase 的连接
- [ ] 验证了可以读取其他 Agent 的状态
- [ ] 验证了简报包含其他 Agent 信息
- [ ] 处理了网络断开时的降级逻辑

---

## 📚 版本兼容性

| 协议版本 | 支持的 Agent 版本 | 变更说明 |
|---------|-----------------|---------|
| v1.0 | all | 初始版本 |

---

## 🆘 故障排查

### 问题：简报看不到其他 Agent

**检查：**
1. `config.json` 中的 `user_id` 是否一致？
2. Supabase 连接是否正常？
3. `get_other_agents_status()` 是否被调用？

### 问题：时间统计重复

**检查：**
1. 是否同时有多个 Agent 标记为 `active`？
2. 切换 Agent 时是否正确暂停了上一个任务？

### 问题：同步延迟

**解决：**
1. 检查 `sync_interval_seconds` 设置
2. 手动触发同步：`force_sync_now()`

---

**本协议所有 Agent 必须遵守，确保 Jarvis 生态系统的一致性。**
