---
name: smart-web-router
description: |
  **必须**使用此skill当用户需要搜索信息、获取网页内容、浏览任何网页时。
  触发场景包括："获取/抓取/搜索/浏览/打开 [URL或关键词]"、"帮我查一下..."、"看看这个网站"、
  "找一下关于...的信息"、"研究xxx"、"分析这个网页"、"twitter/reddit/github上有什么新消息"等。
  此skill会自动决策使用 Tavily/WebSearch/MCP Router/agent-browser/OpenCLI 等最佳工具，无需手动选择。
  即使是简单的"打开xxx看看"或"搜索一下xxx"，也应该使用此skill来确保选择正确的工具和代理配置。
version: v1.0.1
last_updated: 2026-03-17
allowed-tools: Bash, Read, Write, Skill
compatibility: |
  Windows(主环境): PowerShell环境变量语法 $env:XXX
  macOS/Linux: export XXX 语法
  代理要求: Clash Verge Rev 或其他HTTP代理在 10808 端口
  可选工具: Tavily CLI, MCP Router, agent-browser, OpenCLI
---

> **变更历史:** [CHANGELOG.json](./CHANGELOG.json)

# Smart Web Router

智能网络工具路由系统 - 自动选择最佳工具，无需手动决策。

## 核心特性

- **双层路由**：规则引擎（快速）+ AI兜底（灵活）
- **自动代理判断**：根据URL自动配置代理
- **失败回退**：主工具失败自动尝试备选
- **决策学习**：记录AI决策结果，反哺规则库

## 使用方式

```bash
# 直接描述需求，系统自动路由
"获取 https://twitter.com/user 的最新推文"
"搜索 Claude Code 最新功能"
"打开 B站 查看热门视频"
"抓取 https://github.com/xxx 的README"
```

## 执行流程（必须遵循）

当用户提出任何网络相关请求时，**立即**按以下步骤执行：

### Step 1: 解析意图
- 判断是**搜索查询**（关键词）还是**URL获取**（具体链接）
- 使用正则提取URL：`/(https?:\/\/[^\s]+)/i`
- 判断是否有"登录态"、"动态内容"等隐含需求

### Step 2: 规则匹配（Layer 1 - 快速路径）
读取 `config.yaml` 进行匹配：
- **关键词匹配**：`^(搜索|查找|查询|新闻|最新|什么是|怎么样).*`
- **URL白名单**：检查域名是否在 `url_categories.direct.domains`
- **URL黑名单**：检查域名是否在 `url_categories.proxy.domains`

如果匹配成功 → 直接按"工具优先级矩阵"选择工具

### Step 3: AI决策（Layer 2 - 兜底路径）
如果规则无法匹配：
1. 分析URL特征（域名后缀、路径结构）
2. 判断内容类型（文档站/社交媒体/视频平台）
3. 推测是否需要JavaScript渲染
4. 选择最合适的工具

### Step 4: 代理配置（关键步骤）
检查URL分类，**需要代理时必须先设置环境变量**：

```powershell
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:10808"
$env:HTTPS_PROXY="http://127.0.0.1:10808"

# 如果是Node.js工具（如OpenCLI）
$env:GLOBAL_AGENT_HTTP_PROXY="http://127.0.0.1:10808"
$env:GLOBAL_AGENT_HTTPS_PROXY="http://127.0.0.1:10808"
```

### Step 5: 执行与失败回退
1. 调用选定的主工具
2. 如果失败，查看 `fallback_strategies` 中的回退选项
3. 按顺序尝试备选工具，直到成功或耗尽选项
4. **记录决策**：写入 `decisions.log` 供后续学习

### Step 6: 返回结果
- 输出获取的内容
- 简要说明使用了什么工具（便于调试）
- 如果使用了代理，注明"[Via Proxy]"

## 路由决策流程

```
用户请求
    │
    ▼
[Layer 1: 规则引擎] ←── 80% 命中率
    │
    ├── 关键词匹配 → 搜索工具
    │   └── Tavily Search / WebSearch
    │
    ├── URL白名单匹配 → 直连获取
    │   └── WebFetch / Tavily Extract
    │
    ├── URL黑名单匹配 → 代理+浏览器
    │   └── MCP Router / agent-browser
    │
    └── 规则无法判断 ──→ [Layer 2: AI决策]
                            │
                            └── Router Agent 分析
                                └── 输出决策 + 记录学习
```

## 工具优先级矩阵

| 场景 | 第一选择 | 备选1 | 备选2 | 代理需求 |
|------|---------|-------|-------|---------|
| **搜索查询** | Tavily Search | WebSearch | - | ❌ |
| **深度研究** | Tavily Research | Tavily Search | - | ❌ |
| **静态页面(国内)** | WebFetch | Tavily Extract | agent-browser | ❌ |
| **静态页面(国际)** | Tavily Extract | WebFetch | agent-browser | 可选 |
| **动态/登录页** | MCP Router | agent-browser | OpenCLI | ✅ |
| **批量爬取** | Tavily Crawl | - | - | ❌ |

## URL 分类表

### 直连域名（无需代理）
```yaml
direct:
  - github.com
  - bilibili.com
  - zhihu.com
  - juejin.cn
  - csdn.net
  - oschina.net
  - gitee.com
  - jianshu.com
  - weibo.com
  - baidu.com
  - google.com        # 视网络环境
  - stackoverflow.com
  - stackexchange.com
  - medium.com        # 视网络环境
  - dev.to
  - arxiv.org
```

### 代理域名（需要代理）
```yaml
proxy:
  - twitter.com
  - x.com
  - youtube.com
  - reddit.com
  - discord.com
  - instagram.com
  - facebook.com
  - tiktok.com
  - openai.com
  - anthropic.com
  - platform.openai.com
```

## 代理配置

**Clash Verge Rev 配置：**
- Mixed Port: `10808`
- 规则集：Loyalsoldier/clash-rules

**自动设置（路由系统内部处理）：**
```bash
# 需要代理的URL
export HTTP_PROXY=http://127.0.0.1:10808
export HTTPS_PROXY=http://127.0.0.1:10808

# Node.js环境
export GLOBAL_AGENT_HTTP_PROXY=http://127.0.0.1:10808
export GLOBAL_AGENT_HTTPS_PROXY=http://127.0.0.1:10808
```

## 失败回退策略

| 工具 | 失败原因 | 回退到 |
|------|---------|--------|
| Tavily Search | API限制/网络 | WebSearch |
| WebFetch | JS渲染/反爬 | Tavily Extract → agent-browser |
| Tavily Extract | 访问限制 | agent-browser |
| MCP Router | 未连接/超时 | agent-browser |
| OpenCLI | Adapter失效 | agent-browser |

## 决策记录与学习

**记录位置：** `~/.claude/skills/smart-web-router/decisions.log`

**记录格式：**
```json
{
  "timestamp": "2026-03-17T10:30:00Z",
  "request": "获取 https://x.com/user",
  "rule_match": false,
  "ai_decision": {
    "tool": "mcp-router",
    "proxy": true,
    "reason": "twitter.com在代理列表，需要登录态"
  },
  "result": "success",
  "duration_ms": 3200
}
```

**学习机制：**
- 当AI决策命中且成功时，自动更新规则库
- 定期将高频AI决策固化到规则引擎

## 使用示例

### 示例1：搜索信息
```
用户：搜索最新的AI编程助手对比

路由决策：
1. 关键词匹配 "搜索" → 搜索工具
2. 选择 Tavily Search（LLM优化，结构化）
3. 无需代理

执行：
tvly search "AI编程助手对比 Claude Cursor Windsurf" --depth advanced --json
```

### 示例2：获取GitHub内容
```
用户：获取 https://github.com/jackwener/opencli 的README

路由决策：
1. URL匹配直连列表 → github.com
2. 静态页面 → WebFetch（最快）
3. 无需代理

执行：
WebFetch https://github.com/jackwener/opencli
```

### 示例3：浏览Twitter
```
用户：打开 https://twitter.com/elonmusk 看最新推文

路由决策：
1. URL匹配代理列表 → twitter.com
2. 动态内容+登录态 → Browser工具
3. MCP Router已连接 → 使用MCP Router
4. 设置代理环境变量

执行：
设置代理 → mcp__mcp-router__browser_navigate → 提取推文
```

### 示例4：复杂边界情况（AI兜底）
```
用户：帮我看看这个网站有什么内容 https://some-new-site.com

路由决策：
1. URL不在任何列表 → 规则无法匹配
2. 触发AI兜底决策
3. Router Agent分析：
   - 检查域名归属地
   - 判断内容类型
   - 选择最佳工具
4. 执行并记录结果
```

## 快速参考

| 你说 | 系统响应 |
|------|---------|
| "搜索xxx" | → Tavily Search |
| "深度研究xxx" | → Tavily Research |
| "打开/浏览 [URL]" | → 根据URL智能选择工具 |
| "抓取/获取 [URL]" | → 根据URL智能选择工具 |
| "分析xxx网站" | → Tavily Crawl / Map |

## 故障排查

**问题1：Tavily报错未认证**
```bash
# 解决
tvly login --api-key tvly-YOUR_KEY
```

**问题2：MCP Router未连接**
```bash
# 解决
1. 打开 MCP Router 应用
2. 确认 Playwright MCP 状态为绿色
3. 重试
```

**问题3：代理超时**
```bash
# 检查Clash
1. 确认 Clash Verge Rev 已启动
2. 检查 Mixed Port 是否为 10808
3. 检查规则是否生效（日志查看）
```

## 依赖工具

- Tavily CLI: `curl -fsSL https://cli.tavily.com/install.sh | bash`
- MCP Router: GUI应用，需手动启动
- agent-browser: `npm install -g @anthropic-ai/agent-browser`
- OpenCLI: `npm install -g @jackwener/opencli`

## 技术实现

### Router.js 辅助决策脚本

**位置：** `~/.claude/skills/smart-web-router/router.js`

用于程序化路由决策，Node.js 执行：

```bash
node ~/.claude/skills/smart-web-router/router.js "搜索AI最新进展"
# 输出：决策结果JSON，包含推荐工具、代理需求、备选方案
```

**主要函数：**
- `classifyUrl(url)` - 判断URL分类（direct/proxy/unknown）
- `classifyIntent(request)` - 识别用户意图（search/fetch/browse）
- `route(request)` - 完整路由决策，返回工具选择
- `getProxyConfig()` - 获取代理配置

**何时使用：**
- 规则匹配后的程序化验证
- 需要记录决策日志时
- 批量处理多个URL时

### 配置文件

**位置：** `~/.claude/skills/smart-web-router/config.yaml`

可自定义：
- URL分类列表
- 工具优先级
- 代理设置
- 超时参数

### 决策日志

**位置：** `~/.claude/skills/smart-web-router/decisions.log`

记录所有AI兜底决策，用于：
- 追踪高频未知URL
- 评估规则覆盖率
- 自动学习优化规则库
