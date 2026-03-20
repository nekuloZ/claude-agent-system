# Smart Web Router 设计文档
_最后更新：2026-03-20_

本文档说明 smart-web-router 的设计架构和路由策略。

---

## 1. 设计目标

**问题**：网络工具众多（Tavily、SearXNG、opencli、MCP Router），用户不知道选哪个。

**解决方案**：智能路由系统，自动选择最佳工具，无需手动决策。

**核心特性**：
- 双层路由：规则引擎（快速）+ AI兜底（灵活）
- 自动代理判断：根据URL自动配置代理
- 失败回退：主工具失败自动尝试备选

---

## 2. 工具优先级矩阵

| 场景 | 第一选择 | 备选1 | 备选2 | 代理需求 |
|------|---------|-------|-------|---------|
| **搜索查询** | Tavily CLI | SearXNG | - | ❌ |
| **深度研究** | Tavily Research | Tavily Search | - | ❌ |
| **静态页面(国内)** | Tavily Extract | opencli | MCP Router | ❌ |
| **静态页面(国际)** | Tavily Extract | defuddle | MCP Router | 可选 |
| **动态/登录页** | MCP Router | opencli | - | ✅ |
| **批量爬取** | Tavily Crawl | - | - | ❌ |
| **社交内容** | opencli | MCP Router | - | 看平台 |

---

## 3. 路由决策流程

```
用户请求
    │
    ▼
[Layer 1: 规则引擎] ←── 80% 命中率
    │
    ├── 关键词匹配 → 搜索工具
    │   └── Tavily Search / SearXNG
    │
    ├── URL直连匹配 → 内容提取
    │   └── Tavily Extract / defuddle
    │
    ├── URL代理匹配 → 动态浏览器
    │   └── MCP Router / opencli
    │
    └── 规则无法判断 ──→ [Layer 2: AI决策]
                            │
                            └── 分析URL特征
                                └── 选择最佳工具
```

---

## 4. 代理配置策略

### 直连域名（无需代理）

```yaml
direct:
  - github.com
  - bilibili.com
  - zhihu.com
  - juejin.cn
  - csdn.net
  - stackoverflow.com
  - dev.to
  - arxiv.org
```

### 代理域名（需要代理）

```yaml
proxy:
  - twitter.com / x.com
  - youtube.com
  - reddit.com
  - instagram.com
  - facebook.com
  - tiktok.com
  - openai.com
  - anthropic.com
```

### 代理环境变量设置

```powershell
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:10808"
$env:HTTPS_PROXY="http://127.0.0.1:10808"

# macOS/Linux
export HTTP_PROXY="http://127.0.0.1:10808"
export HTTPS_PROXY="http://127.0.0.1:10808"
```

---

## 5. 工具详解

### P1: Tavily CLI（推荐首选）

**用途**：搜索查询、内容提取、深度研究、批量爬取

**命令**：
```bash
# 搜索（推荐）
PYTHONIOENCODING=utf-8 tvly search "关键词" --depth advanced --json

# 提取单个页面
PYTHONIOENCODING=utf-8 tvly extract "URL" --json

# 深度研究
PYTHONIOENCODING=utf-8 tvly research "主题" --json

# 爬取网站
PYTHONIOENCODING=utf-8 tvly crawl "URL" --json
```

**注意**：Windows下必须用 `PYTHONIOENCODING=utf-8` 避免GBK编码错误

### P2: SearXNG（自建搜索引擎）

**URL**：`http://159.75.92.235:8080/`

**用途**：批量查询、研究调研、聚合搜索

**命令**：
```bash
curl "http://159.75.92.235:8080/search?q=关键词&format=json"
```

### P3: opencli（社交/内容平台）

**用途**：B站、知乎、Twitter/X、YouTube等内容平台

**命令**：
```bash
# Twitter
opencli twitter "用户名或搜索词"

# B站
opencli bilibili "关键词"

# YouTube
opencli youtube "关键词"
```

### P4: MCP Router Browser（动态内容）

**用途**：动态页面、登录态、需要JS渲染的内容

**工具**：`mcp__mcp-router__browser_*`

```javascript
// 导航
mcp__mcp-router__browser_navigate({ url: "URL" })

// 截图
mcp__mcp-router__browser_take_screenshot({ type: "png" })

// 提取内容
mcp__mcp-router__browser_snapshot()
```

### P5: defuddle（净含量提取）

**用途**：从网页提取干净的内容（去除广告、导航栏等）

**命令**：
```bash
defuddle "URL"
```

---

## 6. 失败回退策略

| 工具 | 失败原因 | 回退到 |
|------|---------|--------|
| Tavily Search | API限制/网络 | SearXNG |
| Tavily Extract | 访问限制 | defuddle → MCP Router |
| SearXNG | 服务不可用 | Tavily Search |
| opencli | Adapter失效 | MCP Router |
| MCP Router | 未连接/超时 | opencli |

---

## 7. 使用示例

### 示例1：搜索信息

```
用户：搜索最新的AI编程助手对比

路由决策：
1. 关键词匹配 "搜索" → 搜索工具
2. 选择 Tavily Search（LLM优化，结构化）
3. 无需代理

执行：
PYTHONIOENCODING=utf-8 tvly search "AI编程助手对比" --depth advanced --json
```

### 示例2：获取GitHub内容

```
用户：获取 https://github.com/xxx/yyy 的README

路由决策：
1. URL匹配直连列表 → github.com
2. 静态页面 → Tavily Extract（最快）
3. 无需代理

执行：
PYTHONIOENCODING=utf-8 tvly extract "URL"
```

### 示例3：浏览Twitter

```
用户：打开 https://twitter.com/user 看最新推文

路由决策：
1. URL匹配代理列表 → twitter.com
2. 动态内容+登录态 → MCP Router
3. 设置代理环境变量

执行：
设置代理 → mcp__mcp-router__browser_navigate → 提取内容
```

---

## 8. 故障排查

| 问题 | 解决 |
|------|------|
| Tavily报错未认证 | `tvly login --api-key tvly-YOUR_KEY` |
| Tavily输出乱码 | `PYTHONIOENCODING=utf-8 tvly search "关键词"` |
| SearXNG返回空 | `curl "http://159.75.92.235:8080/health"` |
| MCP Router未连接 | 打开 MCP Router 应用，确认 Playwright MCP 状态 |

---

## 9. 依赖安装

```bash
# Tavily CLI
pip install tavily

# opencli
pip install opencli

# defuddle
pip install defuddle
```

---

> **Note**: 这是一个全局 Skill，需要从 `~/.claude/skills/` 加载。
> 同事使用前需要安装上述依赖工具。
