---
name: memory_loader
description: ALWAYS use when session starts, user asks about past events, or needs context from memory system. Loads memory progressively (L0 → L1 → L2 → L3) based on user intent and query keywords. Integrates with Obsidian wikilinks and semantic search.
version: v2.2
last_updated: 2026-03-19
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)

# 记忆加载器

渐进式按需加载记忆系统，从 L0 到 L3，基于意图和关键词智能预加载。

---

## 触发场景

1. **会话启动** (SessionStart Hook) - 自动加载 L0 + 检测场景
2. **历史查询** - 用户问"之前..."、"上次..."、"关于 XXX"
3. **上下文不足** - 上下文窗口 > 50%，需要补充背景
4. **显式请求** - 用户说"搜索记忆"、"查一下..."

---

## 渐进式加载策略

```
用户请求
    │
    ▼
[Stage 0] L0 自动加载（必载）
    │ - scratchpad.md → 今日对话摘要
    │ - next_actions_kanban.md → 待办事项
    │ - habit_data.json → 习惯数据
    │ - .current_task.json → 当前任务
    │ 缺失文件 → warnings 字段记录，不中断流程
    │
    ▼
[Stage 1] 意图识别 → 确定加载范围
    │ - 分析用户 query 关键词
    │ - 匹配预定义加载规则
    │ - 确定需要加载的 L1/L2/L3 内容
    │
    ▼
[Stage 2] 提及层加载（关键词匹配 + 双链过滤）
    │ - 根据文件夹路径预加载相关文档
    │ - 利用 Obsidian 双链预加载关联笔记（相关性过滤）
    │
    ▼ 质量足够？
    ├── 是 → 返回加载结果 ✅
    │
    └── 否且 enable_stage3=True → [Stage 3] 语义搜索补充
    │          - Gemini Embedding 向量搜索（熔断保护）
    │          - 补充召回相关历史记录
    │          - 返回 Top-K 相关片段
    │
    └── 否且 enable_stage3=False → 写入 warnings，降级返回 ⚠️
```

---

## 智能 Token 管理

### Token 估算（v2.2 修复重复正则）

```python
def estimate_tokens(text: str) -> int:
    """
    估算文本的 token 数（基于字符统计）
    - 中文字符：0.6 token/字
    - 英文单词：1.3 token/词
    - 其他字符：0.5 token/字符

    v2.2 修复：english_words 只扫描一次，避免双重 findall
    """
    import re

    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    english_word_spans = re.findall(r'[a-zA-Z]+', text)   # 只调用一次
    english_words = len(english_word_spans)
    english_char_count = sum(len(w) for w in english_word_spans)
    other_chars = len(text) - chinese_chars - english_char_count

    return int(chinese_chars * 0.6 + english_words * 1.3 + other_chars * 0.5)


def estimate_file_tokens(file_path: str, load_type: str = "full") -> int:
    """
    估算加载文件的 token 消耗
    load_type: full | summary | heading | block
    """
    if load_type == "summary":
        content = read_file(file_path)
        return estimate_tokens(content[:500])   # fastPath: 只读前 500 字符
    elif load_type == "heading":
        return 800   # 一个章节约 800 tokens
    elif load_type == "block":
        return 300   # ±50字上下文约 300 tokens
    else:
        content = read_file(file_path)
        return estimate_tokens(content)
```

### 动态预算分配

根据当前上下文使用率调整预算：

```python
def get_token_budget(context_usage: float = 0.0) -> dict:
    """
    根据上下文使用率返回预算配置
    context_usage: 0.0-1.0，当前上下文窗口使用比例

    Returns:
        {
            "stage0": L0 预算,
            "stage1": L1 预算,
            "stage2_per_link": 每个双链的预算,
            "max_p1_links": 最大 P1 关联文件数,
            "enable_stage3": 是否允许 Stage 3 语义搜索
        }
    """
    if context_usage < 0.3:      # 窗口很空（< 30%）
        return {
            "stage0": 1500,
            "stage1": 1200,
            "stage2_per_link": 500,
            "max_p1_links": 10,
            "enable_stage3": True
        }
    elif context_usage < 0.6:    # 窗口中等（30-60%）
        return {
            "stage0": 1000,
            "stage1": 800,
            "stage2_per_link": 400,
            "max_p1_links": 6,
            "enable_stage3": True
        }
    elif context_usage < 0.8:    # 窗口紧张（60-80%）
        return {
            "stage0": 800,
            "stage1": 400,
            "stage2_per_link": 300,
            "max_p1_links": 3,
            "enable_stage3": False   # 跳过语义搜索（节省 token）
            # ⚠️ v2.2: 此时若质量不足，会写入 warnings["stage3_skipped"]
        }
    else:                        # 窗口很紧张（> 80%），只保留 L0
        return {
            "stage0": 500,
            "stage1": 0,
            "stage2_per_link": 0,
            "max_p1_links": 0,
            "enable_stage3": False
        }
```

### 相关性过滤（v2.2 theme_keywords 外部化）

```python
# v2.2: theme_keywords 优先从配置文件加载，内置 fallback
_THEME_KEYWORDS_PATH = ".claude/skills/memory_loader/theme_keywords.json"

def _load_theme_keywords() -> dict:
    """加载主题关键词映射，外部文件优先，内置兜底"""
    try:
        data = read_json(_THEME_KEYWORDS_PATH)
        if data:
            return data
    except (FileNotFoundError, JSONDecodeError):
        pass

    # 内置 fallback（仅作兜底，新主题建议加到 theme_keywords.json）
    return {
        "克服拖延": ["拖延", "不想开始", "启动困难"],
        "克服完美主义": ["完美主义", "害怕失败", "做不好"],
        "能量管理": ["精力", "能量", "疲惫", "状态"],
        "习惯管理": ["习惯", "规律", "坚持", "打卡"],
        "claude-code": ["claude", "code", "编程", "开发"],
        "seedance": ["seedance", "视频", "生成", "ai视频"],
        "minimax": ["minimax", "模型", "ai", "代码"],
    }


def should_preload_link(link_target: str, user_query: str, min_overlap: int = 1) -> bool:
    """
    判断是否应该预加载这个链接（相关性过滤）

    Args:
        link_target: 链接目标（如 "克服拖延"）
        user_query: 用户查询
        min_overlap: 最小关键词重叠数

    Returns:
        True: 应该加载（相关）
        False: 不加载（无关，节省 token）
    """
    if not user_query:
        return True   # 无 query 时全加载（如会话启动）

    # 1. 直接包含：链接名出现在 query 中
    if link_target.lower() in user_query.lower():
        return True

    # 2. 关键词重叠计算
    query_keywords = set(user_query.lower().split())
    link_keywords = set(link_target.lower().split())

    # 3. 主题关键词映射（外部配置）
    theme_keywords = _load_theme_keywords()

    # 4. 检查主题关键词重叠
    if link_target in theme_keywords:
        for keyword in theme_keywords[link_target]:
            if keyword in user_query.lower():
                return True

    # 5. 基础重叠检查
    overlap = query_keywords & link_keywords
    return len(overlap) >= min_overlap


def filter_relevant_links(wikilinks: list, user_query: str, max_links: int = 5) -> list:
    """
    过滤出与 query 最相关的链接（限制数量）
    返回：相关链接列表（最多 max_links 个）
    """
    if not user_query:
        return wikilinks[:max_links]

    relevant = [link for link in wikilinks if should_preload_link(link, user_query)]
    return relevant[:max_links]
```

### 内容质量评估

```python
def evaluate_content_quality(loaded_content: str, user_query: str) -> dict:
    """
    评估加载内容的质量和充分性

    Returns:
        {
            "score": 0-1 质量分数,
            "coverage": 关键词覆盖率,
            "density": 信息密度,
            "needs_more": 是否需要加载更多
        }
    """
    if not loaded_content or len(loaded_content) < 100:
        return {"score": 0.0, "coverage": 0, "density": 0, "needs_more": True}

    # 1. 关键词覆盖率
    query_keywords = extract_keywords(user_query)
    if query_keywords:
        covered = sum(1 for k in query_keywords if k in loaded_content.lower())
        coverage = covered / len(query_keywords)
    else:
        coverage = 0.5   # 无 query 时中性评分

    # 2. 信息密度（去重后行数占比）
    lines = [l.strip() for l in loaded_content.split('\n') if l.strip()]
    unique_lines = set(lines)
    density = len(unique_lines) / len(lines) if lines else 0

    # 3. 内容长度评分（足够长但不过长）
    content_len = len(loaded_content)
    length_score = 1.0 if 200 < content_len < 5000 else 0.5

    # 4. 综合质量分数
    score = coverage * 0.5 + density * 0.3 + length_score * 0.2

    return {
        "score": round(score, 2),
        "coverage": round(coverage, 2),
        "density": round(density, 2),
        "needs_more": score < 0.6
    }


def is_quality_sufficient(
    loaded_results: list,
    user_query: str,
    quality_mode: str = "normal"   # v2.2: strict=0.7 / normal=0.6 / lenient=0.4
) -> bool:
    """
    判断已加载内容是否足够回答 query

    quality_mode:
        "strict"  → 阈值 0.7（历史查询、精确检索场景）
        "normal"  → 阈值 0.6（默认）
        "lenient" → 阈值 0.4（会话启动、宽泛查询场景）
    """
    if not loaded_results:
        return False

    thresholds = {"strict": 0.7, "normal": 0.6, "lenient": 0.4}
    min_score = thresholds.get(quality_mode, 0.6)

    all_content = "\n\n".join([r.get("content", "") for r in loaded_results])
    quality = evaluate_content_quality(all_content, user_query)
    return quality["score"] >= min_score
```

---

## Stage 0: L0 工作层加载

**自动加载（每次会话），文件缺失时写入 warnings，不中断流程：**

```python
L0_FILES = [
    "记忆库/L0_工作区/scratchpad.md",
    "记忆库/L0_工作区/next_actions_kanban.md",
    "记忆库/L0_工作区/habit_data.json",
    "记忆库/L0_工作区/.current_task.json"
]

def load_l0_working(max_tokens: int = 1000) -> tuple[list, list]:
    """
    加载 L0 工作层文件

    v2.2: 返回 (results, warnings) 而非单一列表
    缺失文件不中断，写入 warnings 供调用方感知
    """
    results = []
    warnings = []

    for path in L0_FILES:
        try:
            content = read_file(path)
            tokens = estimate_tokens(content)
            results.append({
                "path": path,
                "priority": "P0",
                "source": "stage0_auto",
                "tokens": tokens,
                "content": content[:max_tokens * 4]   # 粗略字符截断
            })
        except FileNotFoundError:
            warnings.append({
                "type": "file_missing",
                "path": path,
                "message": f"L0 文件不存在，跳过: {path}"
            })
        except Exception as e:
            warnings.append({
                "type": "read_error",
                "path": path,
                "message": f"读取失败: {str(e)}"
            })

    return results, warnings
```

**提取信息:**
- 今日已做事项
- 未闭环事项
- 活跃任务
- 今日习惯状态

---

## Stage 1: 意图识别

### 1.1 查询类型判断

| 用户 Query 模式 | 类型 | 加载策略 |
|----------------|------|---------|
| "早上好"/"hey jarvis" | 会话启动 | L0 + 场景检测 |
| "复盘"/"Archive" | 日归档 | L0 全部 + 昨日日报 |
| "之前..."/"上次..." | 历史查询 | L1 Daily + 语义搜索 |
| "关于 XXX 项目" | 项目查询 | L1 Projects + 相关任务 |
| "张三..."/"李四..." | 人物查询 | L1 Relationships |
| "克服拖延"/"健康管理" | 主题查询 | L3 Themes |
| "单词"/"跟读" | 学习查询 | L3 Learning/Language |
| "帮我解决..." | 问题解决 | L2 Procedural + 相关 Themes |

### 1.2 关键词提取

```python
def extract_keywords(query):
    """提取查询中的关键实体"""
    projects = extract_project_names(query)   # 匹配 L1/Projects 文件名
    people = extract_person_names(query)      # 匹配 L1/Relationships
    themes = extract_theme_keywords(query)    # 匹配 L3/Themes
    dates = extract_date_references(query)    # 今天、昨天、上周、2026-03-16
    return {
        "projects": projects,
        "people": people,
        "themes": themes,
        "dates": dates
    }
```

---

## Stage 2: 提及层加载

### 2.1 基于路径的预加载

**文件夹预加载规则:**

| 匹配条件 | 预加载文件夹 | 优先级 |
|---------|-------------|--------|
| 提及项目名 | `L1_长期记忆/02-Projects/` | P0 |
| 提及人名 | `L1_长期记忆/03-Relationships/` | P0 |
| 提及日期 | `L1_长期记忆/01-Daily/` | P0 |
| 提及周数 | `L1_长期记忆/04-Weekly/` | P0 |
| 提及课题 | `L3_用户档案/02-Themes/` | P0 |
| 提及学习 | `L3_用户档案/03-Learning/` | P0 |
| 提及术语 | `L3_用户档案/04-Definitions/` | P1 |
| 提及技能 | `L2_知识库/reference/` | P1 |

### 2.2 Obsidian 双链预加载（块级加载）

**支持三种链接类型:**

| 链接类型 | 格式 | 加载内容 | Token 预算 |
|---------|------|---------|-----------|
| 文档链接 | `[[文档名]]` | Frontmatter + 标题 + 摘要（前200字） | 500 |
| 标题链接 | `[[文档名#标题]]` | 该标题下的内容块 | 800 |
| 块链接 | `[[文档名#^块ID]]` | 精确块内容（前后各50字上下文） | 300 |

**读取文件时自动提取 wikilinks:**

```python
def preload_linked_notes(file_path, depth=1, user_query=None, max_links=5):
    """
    预加载文件中的 wikilink 关联笔记
    depth: 预加载深度（1=直接链接，2=二级链接）
    user_query: 用户查询，用于相关性过滤（None=不过滤）
    max_links: 最多加载的链接数

    Returns: (related_files: list, warnings: list)
    """
    content = read_file(file_path)

    # 提取 [[wikilinks]]，去重
    raw_links = re.findall(r'\[\[([^\]]+)\]\]', content)
    seen = set()
    all_links = []
    for raw in raw_links:
        target = raw.split("|")[0]
        if target not in seen:
            seen.add(target)
            all_links.append(target)

    # 相关性过滤
    wikilinks = filter_relevant_links(all_links, user_query, max_links=max_links)

    related_files = []
    warnings = []

    for link in wikilinks:
        link_type, target, anchor = parse_link(link)
        resolved = resolve_wikilink(target)

        if not resolved:
            warnings.append({
                "type": "link_unresolved",
                "link": link,
                "message": f"找不到文件: {target}"
            })
            continue

        if link_type == "block":
            block_content, block_warn = load_block_content(resolved, anchor)
            if block_warn:
                warnings.append(block_warn)
            related_files.append({
                "path": resolved,
                "priority": "P1",
                "link_type": "block_ref",
                "anchor": anchor,
                "content": block_content
            })
        elif link_type == "heading":
            section_content = load_section_content(resolved, anchor)
            related_files.append({
                "path": resolved,
                "priority": "P1",
                "link_type": "heading_ref",
                "anchor": anchor,
                "content": section_content
            })
        else:
            summary = load_document_summary(resolved)
            related_files.append({
                "path": resolved,
                "priority": "P1",
                "link_type": "doc_ref",
                "content": summary
            })

    return related_files, warnings


def parse_link(link_str):
    """解析链接字符串，Returns: (type, target, anchor)"""
    target = link_str.split("|")[0] if "|" in link_str else link_str

    if "#^" in target:
        parts = target.split("#^")
        return ("block", parts[0], parts[1])
    elif "#" in target:
        parts = target.split("#")
        return ("heading", parts[0], parts[1])
    else:
        return ("doc", target, None)


def load_block_content(file_path, block_id) -> tuple[str, dict | None]:
    """
    加载指定块 ID 的内容（含前后上下文）

    v2.2: 返回 (content, warning_or_None)
    块 ID 不存在时返回描述性内容，而非空串（静默失败→显式警告）
    """
    content = read_file(file_path)
    lines = content.split('\n')

    for i, line in enumerate(lines):
        if f"^{block_id}" in line or f"<!-- {block_id} -->" in line:
            start = max(0, i - 2)
            end = min(len(lines), i + 3)
            return '\n'.join(lines[start:end]), None

    # v2.2: 块 ID 找不到，返回警告而非空串
    warn = {
        "type": "block_not_found",
        "file": file_path,
        "block_id": block_id,
        "message": f"块 ID ^{block_id} 在 {file_path} 中不存在，已跳过"
    }
    return "", warn


def load_section_content(file_path, heading):
    """加载指定标题下的内容"""
    content = read_file(file_path)
    lines = content.split('\n')

    result = []
    in_section = False
    section_level = 0

    for line in lines:
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            title = line.lstrip('#').strip()

            if title == heading:
                in_section = True
                section_level = level
                result.append(line)
            elif in_section and level <= section_level:
                break
        elif in_section:
            result.append(line)

    return '\n'.join(result)


def load_document_summary(file_path):
    """加载文档摘要（frontmatter + 前200字）"""
    content = read_file(file_path)

    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            frontmatter = parts[1]
            body = parts[2].strip()
            summary = body[:200] + "..." if len(body) > 200 else body
            return f"---\n{frontmatter}\n---\n\n{summary}"

    return content[:500]
```

**上下文优先级标记:**
- **P0 (主上下文)**: 用户直接提及的文件
- **P1 (关联上下文)**: 通过双链关联的文件
- **P2 (背景上下文)**: 语义搜索召回的文件

---

## Stage 3: 语义搜索补充（v2.2 熔断保护）

**触发条件:**
- Stage 2 返回结果 < 3 条
- 最高匹配度 < 0.7
- 用户明确说"搜索..."

```python
# v2.2: 熔断状态（单会话有效）
_semantic_circuit = {"open": False, "fail_count": 0, "max_fails": 2}

def semantic_search_fallback(query, top_k=5) -> tuple[list, list]:
    """
    使用 Gemini Embedding 进行语义搜索

    v2.2: 熔断保护
    - 失败 2 次 → 熔断器打开，本会话后续不再调用
    - 返回 (results, warnings)
    """
    warnings = []

    # 熔断器检查
    if _semantic_circuit["open"]:
        warnings.append({
            "type": "circuit_open",
            "message": "Gemini API 熔断中（本会话已失败 2 次），跳过语义搜索"
        })
        return [], warnings

    try:
        results = call_embedding_api(
            query=query,
            filters={
                "folders": ["L1_长期记忆", "L0_工作区"],
                "exclude": [".data", "node_modules"]
            },
            top_k=top_k
        )
        _semantic_circuit["fail_count"] = 0   # 成功，重置计数
        return [
            {
                "path": r.file_path,
                "content": r.content,
                "score": r.similarity_score,
                "priority": "P2"
            }
            for r in results
        ], []

    except Exception as e:
        _semantic_circuit["fail_count"] += 1
        if _semantic_circuit["fail_count"] >= _semantic_circuit["max_fails"]:
            _semantic_circuit["open"] = True

        warnings.append({
            "type": "semantic_search_error",
            "message": f"语义搜索失败（第 {_semantic_circuit['fail_count']} 次）: {str(e)}"
        })
        return [], warnings
```

---

## 执行流程

### 标准调用（v2.2 修复：消除双重质量评估调用）

```python
def load_memory(
    query=None,
    context_usage=0.0,
    quality_mode="normal",        # v2.2: strict/normal/lenient
    output_mode="full"            # v2.2: full/reference（观察遮蔽）
):
    """
    主入口：渐进式加载记忆

    Args:
        query: 用户查询（可选）
        context_usage: 当前上下文使用率 (0.0-1.0)
        quality_mode: 质量阈值模式 (strict=0.7/normal=0.6/lenient=0.4)
        output_mode:
            "full"      → 返回完整内容
            "reference" → 只返回路径和摘要（观察遮蔽，节省 token）

    Returns:
        包含 loaded_files, metadata, token_consumption, warnings 的字典
    """
    budget = get_token_budget(context_usage)
    token_log = {"stage0": 0, "stage1": 0, "stage2": 0, "stage3": 0, "total": 0}
    loaded = []
    all_warnings = []

    # Stage 0: L0 必载
    l0_data, l0_warns = load_l0_working(max_tokens=budget["stage0"])
    loaded.extend(l0_data)
    all_warnings.extend(l0_warns)
    token_log["stage0"] = sum(d.get("tokens", 0) for d in l0_data)

    # Stage 1: 意图识别
    intent = analyze_intent(query or "")

    # Stage 2: 提及层预加载
    if intent["keywords"] and budget["stage1"] > 0:
        keyword_results = preload_by_keywords(
            intent["keywords"],
            max_files=budget["max_p1_links"]
        )
        loaded.extend(keyword_results)
        token_log["stage1"] = sum(r.get("tokens", 0) for r in keyword_results)

        for file in keyword_results:
            if file["priority"] == "P0":
                linked, link_warns = preload_linked_notes(
                    file["path"],
                    depth=1,
                    user_query=query,
                    max_links=budget["max_p1_links"]
                )
                loaded.extend(linked)
                all_warnings.extend(link_warns)
                token_log["stage2"] += sum(l.get("tokens", 0) for l in linked)

    # v2.2: 质量评估只做一次，缓存结果
    quality_ok = is_quality_sufficient(loaded, query, quality_mode=quality_mode)

    # Stage 3: 语义搜索（仅在需要且允许时）
    stage3_used = False
    if not quality_ok and budget["enable_stage3"]:
        semantic_results, semantic_warns = semantic_search_fallback(query, top_k=3)
        loaded.extend(semantic_results)
        all_warnings.extend(semantic_warns)
        token_log["stage3"] = sum(s.get("tokens", 0) for s in semantic_results)
        stage3_used = True
    elif not quality_ok and not budget["enable_stage3"]:
        # v2.2: 显式记录降级，不再静默
        all_warnings.append({
            "type": "stage3_skipped",
            "message": f"内容质量不足（{quality_mode} 模式），但上下文使用率 {context_usage:.0%} 过高，已跳过语义搜索",
            "context_usage": context_usage,
            "suggestion": "考虑调用 /compress 压缩上下文后重试"
        })

    token_log["total"] = sum(token_log.values())

    # v2.2: 观察遮蔽模式（output_mode="reference"）
    final_loaded = loaded
    if output_mode == "reference":
        final_loaded = [
            {
                "path": r.get("path"),
                "priority": r.get("priority"),
                "source": r.get("source"),
                "tokens": r.get("tokens", 0),
                "content_summary": r.get("content", "")[:100] + "..."
                # 不包含完整 content，按需展开
            }
            for r in loaded
        ]

    result = deduplicate_and_sort(final_loaded)

    return {
        "loaded_files": result,
        "metadata": {
            "total_files": len(result),
            "p0_count": sum(1 for r in result if r.get("priority") == "P0"),
            "p1_count": sum(1 for r in result if r.get("priority") == "P1"),
            "p2_count": sum(1 for r in result if r.get("priority") == "P2"),
            "quality_mode": quality_mode,
            "semantic_search_used": stage3_used,
            "output_mode": output_mode
        },
        "token_consumption": token_log,
        "warnings": all_warnings    # v2.2: 调用方可感知所有异常
    }
```

### 会话启动场景

```python
def load_session_startup():
    """会话启动时的记忆加载"""
    l0, warns = load_l0_working()
    scene = detect_scene(l0)

    if scene == "same_day_multi_session":
        return l0, warns

    elif scene == "new_day_first":
        yesterday = get_yesterday_log()
        return l0 + [yesterday], warns

    elif scene == "clear_recovery":
        last = load_last_session()
        return l0 + [last], warns
```

---

## 观察遮蔽模式（v2.2 新增）

上下文工程最佳实践：用引用替代完整内容，按需展开，减少 token 消耗。

```
# 场景：上下文紧张（context_usage > 0.6）时，优先使用 reference 模式

# 调用示例
result = load_memory(
    query="上次 Jarvis 系统重构的决策",
    context_usage=0.65,
    output_mode="reference"   # 只返回摘要引用
)

# 返回示例（reference 模式）
{
  "loaded_files": [
    {
      "path": "L1_长期记忆/01-Daily/2026-03-18.md",
      "priority": "P0",
      "content_summary": "Jarvis v5.0 Rules Architecture 完成，skills 联动..."
      # content 字段不出现，节省 ~800 tokens
    }
  ],
  "metadata": { "output_mode": "reference", ... }
}

# 用户追问具体内容时，再按路径加载完整内容（stage3 按需深度加载）
```

**两种模式对比：**

| 模式 | token 消耗 | 适用场景 |
|------|-----------|---------|
| `full` | 100%（完整内容） | 上下文宽松（< 60%） |
| `reference` | ~15%（仅路径+摘要） | 上下文紧张（> 60%），初步扫描 |

---

## 输出格式（v2.2 新增 warnings 字段）

```json
{
  "loaded_files": [
    {
      "path": "L0_工作区/scratchpad.md",
      "priority": "P0",
      "source": "stage0_auto",
      "tokens": 420,
      "content_summary": "今日完成：记忆系统架构设计..."
    },
    {
      "path": "L1_长期记忆/02-Projects/Jarvis系统.md",
      "priority": "P0",
      "source": "stage2_keyword_match",
      "tokens": 310,
      "linked_from": ["scratchpad.md"]
    },
    {
      "path": "L3_用户档案/02-Themes/克服拖延.md",
      "priority": "P1",
      "source": "stage2_wikilink",
      "tokens": 180,
      "filtered_by": "relevance"
    }
  ],
  "metadata": {
    "total_files": 3,
    "p0_count": 2,
    "p1_count": 1,
    "p2_count": 0,
    "quality_mode": "normal",
    "semantic_search_used": false,
    "output_mode": "full"
  },
  "token_consumption": {
    "stage0": 420,
    "stage1": 310,
    "stage2": 180,
    "stage3": 0,
    "total": 910
  },
  "warnings": [
    {
      "type": "file_missing",
      "path": "记忆库/L0_工作区/.current_task.json",
      "message": "L0 文件不存在，跳过: .current_task.json"
    }
  ]
}
```

---

## 与其他 Skill 的集成

### session_startup

```python
def on_session_start():
    context, warns = memory_loader.load_session_startup()
    if warns:
        log_warnings(warns)   # 记录但不中断
    briefing = generate_briefing(context)
    return briefing
```

### theme_insight_tracker

```python
def before_update_theme(theme_name):
    result = memory_loader.load_memory(
        query=f"关于 {theme_name} 的历史记录",
        quality_mode="strict"   # 主题更新需要高质量上下文
    )
    if result["warnings"]:
        handle_warnings(result["warnings"])
    return result
```

---

## 配置文件（v2.2 新增）

### theme_keywords.json

新增主题时，编辑此文件而非改代码：

```json
// .claude/skills/memory_loader/theme_keywords.json
{
  "克服拖延": ["拖延", "不想开始", "启动困难"],
  "克服完美主义": ["完美主义", "害怕失败", "做不好"],
  "能量管理": ["精力", "能量", "疲惫", "状态"],
  "习惯管理": ["习惯", "规律", "坚持", "打卡"],
  "claude-code": ["claude", "code", "编程", "开发"],
  "seedance": ["seedance", "视频", "生成", "ai视频"],
  "minimax": ["minimax", "模型", "ai", "代码"]
}
```

### 环境变量

```bash
GEMINI_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx

MEMORY_LOADER_MAX_P0=10      # 最大 P0 文件数
MEMORY_LOADER_MAX_P1=20      # 最大 P1 文件数
MEMORY_LOADER_MAX_DEPTH=2    # 双链预加载深度
```

---

## 测试策略（v2.2 新增）

### 单元测试

| 测试目标 | 场景 | 期望结果 |
|---------|------|---------|
| `estimate_tokens` | 纯中文文本 | tokens ≈ 字数 × 0.6 |
| `estimate_tokens` | 纯英文文本 | tokens ≈ 词数 × 1.3 |
| `should_preload_link` | query=None | 永远返回 True |
| `should_preload_link` | 完全无关的链接 | 返回 False |
| `load_block_content` | 块 ID 不存在 | 返回 `("", warning_dict)` |
| `load_block_content` | 块 ID 存在 | 返回内容，`warning=None` |
| `is_quality_sufficient` | empty list | 返回 False |
| `is_quality_sufficient` | quality_mode=strict | 阈值 0.7 |

### 集成测试

| 测试目标 | 场景 | 期望结果 |
|---------|------|---------|
| `load_memory` | L0 文件全缺失 | 返回空 loaded_files + warnings，不抛异常 |
| `load_memory` | context_usage=0.75 | `enable_stage3=False`，质量不足时 warnings 有 stage3_skipped |
| `load_memory` | output_mode=reference | loaded_files 无 content 字段 |
| `semantic_search_fallback` | API 连续失败 2 次 | 第 3 次调用时熔断，返回 circuit_open warning |
| `load_memory` | 双重质量评估验证 | `is_quality_sufficient` 在一次 load_memory 中只被调用一次 |

### 边界场景

```
# 场景 1: theme_keywords.json 损坏
input: 损坏的 JSON 文件
expect: 回退到内置 fallback，不中断

# 场景 2: wikilink 指向不存在的文件
input: [[不存在的文件名]]
expect: warnings 有 link_unresolved，其他链接正常加载

# 场景 3: 超长文件
input: 10万字的 scratchpad.md
expect: 按 max_tokens 截断，tokens 字段准确

# 场景 4: 纯 emoji 文本
input: "🎉🎊🎈" (无中英文)
expect: estimate_tokens 返回合理值（不为 0，不崩溃）
```

---

## 快捷检查

调用 memory_loader 前确认:

**加载前：**
1. [ ] 是否传入 `context_usage`？（动态预算依赖它）
2. [ ] 是否传入 `query`？（相关性过滤依赖它）
3. [ ] `quality_mode` 是否匹配场景？（历史查询用 strict，会话启动用 lenient）
4. [ ] 上下文紧张（> 60%）时是否考虑 `output_mode="reference"`？

**加载后（v2.2 质量验证）：**
5. [ ] `warnings` 是否有 `stage3_skipped`？若有，考虑压缩上下文
6. [ ] `warnings` 是否有 `file_missing`？若有，检查 L0 文件是否存在
7. [ ] `token_consumption.total` 是否在预算内？
8. [ ] `metadata.p1_count` 是否合理（不超过 `max_p1_links`）？

---

## 相关文档

- [[ARCHITECTURE]] - 记忆系统架构
- [[l3_update_log_template]] - L3 修改记录模板
- [[session_startup_protocol]] - 会话启动协议
- `theme_keywords.json` - 主题关键词配置（新增主题在此文件编辑）
