#!/usr/bin/env node
/**
 * Smart Web Router - 路由决策引擎
 * 用法: node router.js <request>
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 加载配置
const configPath = path.join(__dirname, 'config.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// URL分类判断
function classifyUrl(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        // 检查直连列表
        for (const domain of config.url_categories.direct.domains) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                return { category: 'direct', proxy: false };
            }
        }

        // 检查代理列表
        for (const domain of config.url_categories.proxy.domains) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                return { category: 'proxy', proxy: true };
            }
        }

        // 未知域名，需要AI决策
        return { category: 'unknown', proxy: null };
    } catch (e) {
        return { category: 'invalid', proxy: null };
    }
}

// 意图识别
function classifyIntent(request) {
    const patterns = {
        search: /^(搜索|查找|查询|找一下|搜一下|news|latest|什么是|怎么样|如何)/i,
        research: /^(研究|分析|对比|调研|综述|深度分析|report)/i,
        crawl: /(批量|爬取|抓取整个|所有页面|批量下载)/i,
        browse: /^(打开|浏览|访问|查看|进入)/i,
        fetch: /^(获取|抓取|下载|提取|get|fetch)/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
        if (pattern.test(request)) {
            return intent;
        }
    }

    // 包含URL则默认是fetch
    if (/https?:\/\//.test(request)) {
        return 'fetch';
    }

    return 'unknown';
}

// 提取URL
function extractUrl(request) {
    const match = request.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[1] : null;
}

// 决策路由
function route(request) {
    const intent = classifyIntent(request);
    const url = extractUrl(request);

    console.log(`📊 意图识别: ${intent}`);
    if (url) console.log(`🔗 URL: ${url}`);

    // Layer 1: 规则引擎

    // 场景1: 搜索
    if (intent === 'search') {
        return {
            decision: 'tavily-search',
            proxy: false,
            reason: '搜索查询 -> Tavily Search (LLM优化)',
            fallback: 'websearch',
            layer: 'rule'
        };
    }

    // 场景2: 深度研究
    if (intent === 'research') {
        return {
            decision: 'tavily-research',
            proxy: false,
            reason: '深度研究 -> Tavily Research',
            fallback: 'tavily-search',
            layer: 'rule'
        };
    }

    // 场景3: 批量爬取
    if (intent === 'crawl') {
        return {
            decision: 'tavily-crawl',
            proxy: false,
            reason: '批量爬取 -> Tavily Crawl',
            fallback: null,
            layer: 'rule'
        };
    }

    // 场景4: 有URL的情况
    if (url) {
        const urlInfo = classifyUrl(url);

        if (urlInfo.category === 'direct') {
            // 国内站点，优先WebFetch
            return {
                decision: 'webfetch',
                proxy: false,
                reason: '国内站点 -> WebFetch (最快)',
                fallback: 'tavily-extract',
                layer: 'rule'
            };
        }

        if (urlInfo.category === 'proxy') {
            // 国际站点，需要浏览器
            return {
                decision: 'mcp-router',
                proxy: true,
                reason: '国际站点 -> MCP Router (需代理)',
                fallback: 'agent-browser',
                layer: 'rule'
            };
        }
    }

    // Layer 2: AI兜底决策
    return {
        decision: 'ai',
        proxy: null,
        reason: '规则无法匹配，需要AI决策',
        fallback: null,
        layer: 'ai',
        context: { intent, url, urlInfo: url ? classifyUrl(url) : null }
    };
}

// 输出代理配置
function getProxyConfig() {
    return {
        HTTP_PROXY: config.proxy.http_proxy,
        HTTPS_PROXY: config.proxy.https_proxy,
        GLOBAL_AGENT_HTTP_PROXY: config.proxy.node.global_agent_http,
        GLOBAL_AGENT_HTTPS_PROXY: config.proxy.node.global_agent_https
    };
}

// 主函数
function main() {
    const request = process.argv.slice(2).join(' ');

    if (!request) {
        console.error('用法: node router.js "搜索AI最新进展"');
        process.exit(1);
    }

    console.log(`\n🎯 请求: ${request}\n`);

    const result = route(request);

    console.log('\n📋 决策结果:');
    console.log(JSON.stringify(result, null, 2));

    if (result.proxy) {
        console.log('\n🔧 代理配置:');
        console.log(getProxyConfig());
    }

    // 记录决策（实际使用时可启用）
    // logDecision(request, result);
}

// 记录决策日志
function logDecision(request, result) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        request,
        result
    };

    const logPath = path.join(__dirname, 'decisions.log');
    const logs = fs.existsSync(logPath)
        ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
        : [];

    logs.push(logEntry);

    // 保留最近1000条
    if (logs.length > 1000) logs.shift();

    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = { route, classifyUrl, classifyIntent, getProxyConfig };
