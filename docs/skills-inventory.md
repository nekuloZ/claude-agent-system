# Skills 清单 - 模板系统保留/剔除说明
_最后更新：2026-03-20_

## 保留 Skills（通用架构）

共 **18** 个，包含核心任务管理、记忆系统、模式切换等功能。

| Skill | 功能 | 模式 |
|-------|------|------|
| project_manager | L3 项目管理 | assist |
| task_manager | L2 任务管理 | assist |
| action_manager | L1 原子动作 | assist |
| task_completion | 任务完成归档 | assist |
| progress_tracker | 任务进展追踪 | assist |
| record | 记忆持久化 | all |
| daily_review_archiver | 日复盘归档 | assist |
| weekly_review_archiver | 周归档 | assist |
| session_startup | 会话启动 | all |
| habit_tracker | 习惯记录 | assist |
| mode-switcher | 模式切换 | all |
| theme_insight_tracker | 洞察追踪 | all |
| memory_loader | 记忆加载 | all |
| ambiguous_context | 模糊上下文处理 | all |
| munger_observer | 芒格心智模型 | assist |
| self-improvement | 自我改进 | all |
| scene-router | 场景路由 | all |
| h | 触发词速查表 | all |

## 剔除 Skills（个人业务/偏好）

共 **12** 个，包含 nekulo 个人业务、娱乐、学习偏好等。

| Skill | 剔除原因 |
|-------|----------|
| daily_report | 连接 nekulo 的飞书表格，业务专用 |
| feishu_export | 飞书专用，同事不一定用飞书 |
| video_analyzer | 业务专用（主播数据分析） |
| tts_reader | 个人偏好（语音朗读） |
| app_launcher | Windows 路径硬编码，跨平台困难 |
| rtsc_manager | OBS 专用，个人娱乐 |
| game_trainer_search | 游戏修改器搜索，个人娱乐 |
| favorites_manager | 个人收藏夹，内容需自定义 |
| continuous-learning | 实验性，非核心功能 |
| ontology | 实验性，非核心功能 |
| personality-test | 娱乐性质，非必需 |
| poster_editor | 业务专用（海报编辑） |

## 可选 Skills（语言学习相关）

共 **3** 个，与语言学习相关，同事可选择性保留。

| Skill | 功能 | 建议 |
|-------|------|------|
| vocabulary_manager | 词汇管理 | 可选保留（如同事也需要学语言） |
| shadowing_manager | 影子跟读 | 可选保留 |
| short_sentence_trainer | 短句训练 | 可选保留 |

## 全局 Skills 依赖（不放在模板中）

以下 Skills 通过 `~/.claude/skills/` 全局安装，模板中不复制：

| Skill | 用途 |
|-------|------|
| obsidian-markdown | Markdown 写入（必须） |
| obsidian-bases | Obsidian Bases 数据库 |
| json-canvas | JSON Canvas 画布 |
| smart-web-router | 网络搜索路由 |
| opencli | 社交/内容平台 CLI |

## 文件路径说明

保留的 Skills 需检查并更新以下路径引用：
- `jarvis-memory/` → `记忆库/`
- `L0_Working/` → `L0_工作区/`
- `L1_Episodic/` → `L1_长期记忆/`
- `L2_Procedural/` → `L2_知识库/`
- `L3_User/` → `L3_用户档案/`
