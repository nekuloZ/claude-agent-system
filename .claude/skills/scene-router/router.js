#!/usr/bin/env node
/**
 * Jarvis Scene Router - 场景路由逻辑
 *
 * 供 Skills 调用，处理场景检测和预加载
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const SIGNAL_PATH = path.join(__dirname, '..', '..', '.pending_signal.json');
const JARVIS_ROOT = path.join(__dirname, '..', '..', '..');

/**
 * 加载配置
 */
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load config:', e.message);
    return null;
  }
}

/**
 * 读取信号文件
 */
function readSignal() {
  try {
    if (!fs.existsSync(SIGNAL_PATH)) {
      return null;
    }

    const data = fs.readFileSync(SIGNAL_PATH, 'utf-8');
    const signal = JSON.parse(data);

    // 检查有效期 (5分钟)
    const ttl = 5 * 60 * 1000;
    if (Date.now() - signal.timestamp > ttl) {
      fs.unlinkSync(SIGNAL_PATH);
      return null;
    }

    return signal;
  } catch (e) {
    return null;
  }
}

/**
 * 清理信号文件
 */
function clearSignal() {
  try {
    if (fs.existsSync(SIGNAL_PATH)) {
      fs.unlinkSync(SIGNAL_PATH);
      return true;
    }
  } catch (e) {
    // 忽略错误
  }
  return false;
}

/**
 * 获取场景配置
 */
function getSceneConfig(sceneName, config = null) {
  const cfg = config || loadConfig();
  if (!cfg || !cfg.scenes) return null;
  return cfg.scenes[sceneName] || null;
}

/**
 * 检查信号是否匹配指定场景
 */
function matchSignalToScene(targetScene, signal = null) {
  const sig = signal || readSignal();
  if (!sig) return null;

  if (sig.scene === targetScene) {
    return {
      matched: true,
      confidence: sig.confidence,
      keywords: sig.keywords,
      timestamp: sig.timestamp
    };
  }

  // 检查备选匹配
  if (sig.allMatches) {
    const altMatch = sig.allMatches.find(m => m.scene === targetScene);
    if (altMatch) {
      return {
        matched: true,
        confidence: altMatch.confidence,
        keywords: altMatch.keywords,
        timestamp: sig.timestamp,
        isAlternative: true
      };
    }
  }

  return { matched: false };
}

/**
 * 获取预加载文件列表
 */
function getPreloadFiles(sceneName, config = null) {
  const sceneConfig = getSceneConfig(sceneName, config);
  if (!sceneConfig) return [];

  const files = [];

  // L0 文件（最高优先级）
  if (sceneConfig.l0_files) {
    for (const filePath of sceneConfig.l0_files) {
      const fullPath = path.join(JARVIS_ROOT, filePath);
      if (fs.existsSync(fullPath)) {
        files.push({
          path: fullPath,
          priority: 'P0',
          type: 'l0_working'
        });
      }
    }
  }

  // 预加载路径
  if (sceneConfig.preload_paths) {
    for (const dirPath of sceneConfig.preload_paths) {
      const fullPath = path.join(JARVIS_ROOT, dirPath);
      if (fs.existsSync(fullPath)) {
        try {
          const entries = fs.readdirSync(fullPath, { withFileTypes: true });

          // 获取该目录下的文件（限制数量）
          let count = 0;
          for (const entry of entries) {
            if (count >= 5) break; // 每个目录最多5个文件

            if (entry.isFile() && entry.name.endsWith('.md')) {
              files.push({
                path: path.join(fullPath, entry.name),
                priority: sceneConfig.priority || 'P1',
                type: 'scene_preload'
              });
              count++;
            }
          }
        } catch (e) {
          // 忽略目录读取错误
        }
      }
    }
  }

  return files;
}

/**
 * 执行场景预加载
 */
function executePreload(sceneName, options = {}) {
  const config = loadConfig();
  const sceneConfig = getSceneConfig(sceneName, config);

  if (!sceneConfig) {
    return {
      success: false,
      error: `Scene "${sceneName}" not found in config`
    };
  }

  const files = getPreloadFiles(sceneName, config);

  // 读取文件内容
  const loaded = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      loaded.push({
        ...file,
        content: content.substring(0, options.maxContentLength || 5000)
      });
    } catch (e) {
      // 忽略单个文件错误
    }
  }

  // 清理信号（如果要求）
  if (options.clearSignal !== false) {
    clearSignal();
  }

  return {
    success: true,
    scene: sceneName,
    filesLoaded: loaded.length,
    files: loaded.map(f => ({
      path: f.path,
      priority: f.priority,
      type: f.type,
      contentLength: f.content?.length || 0
    })),
    content: options.includeContent ? loaded : undefined
  };
}

/**
 * CLI 入口
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'check': {
      // 检查信号: node router.js check [scene]
      const targetScene = args[1];
      const signal = readSignal();

      if (!signal) {
        console.log(JSON.stringify({ hasSignal: false }));
        return;
      }

      if (targetScene) {
        const match = matchSignalToScene(targetScene, signal);
        console.log(JSON.stringify({
          hasSignal: true,
          signal,
          match
        }));
      } else {
        console.log(JSON.stringify({
          hasSignal: true,
          signal
        }));
      }
      break;
    }

    case 'preload': {
      // 执行预加载: node router.js preload <scene>
      const scene = args[1];
      if (!scene) {
        console.error('Usage: node router.js preload <scene>');
        process.exit(1);
      }

      const result = executePreload(scene, { includeContent: true });
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'clear': {
      // 清理信号: node router.js clear
      const cleared = clearSignal();
      console.log(JSON.stringify({ cleared }));
      break;
    }

    case 'list': {
      // 列出配置: node router.js list
      const config = loadConfig();
      console.log(JSON.stringify({
        scenes: Object.keys(config.scenes),
        version: config.version
      }));
      break;
    }

    default: {
      console.log(`
Jarvis Scene Router

Usage:
  node router.js check [scene]    - 检查信号，可选指定场景
  node router.js preload <scene>  - 执行场景预加载
  node router.js clear            - 清理信号文件
  node router.js list             - 列出可用场景

Examples:
  node router.js check learning
  node router.js preload operation
      `);
    }
  }
}

// 模块导出（供其他脚本使用）
module.exports = {
  loadConfig,
  readSignal,
  clearSignal,
  getSceneConfig,
  matchSignalToScene,
  getPreloadFiles,
  executePreload
};

// CLI 执行
if (require.main === module) {
  main();
}
