#!/bin/bash
set -e

# Vercel 部署时应用从域名根路径提供服务（非 /app/<appId>/ 子路径）。
# 设置 CLIENT_BASE_PATH=/ 让构建时 basename 和 baseURL 编译为根路径。
# 这是第一层保障；如果 Vercel 环境下环境变量未正确传递，
# 下方 sed 替换作为第二层保障，直接修正构建产物。
export CLIENT_BASE_PATH=/

npm run build:server
npm run build:client

mkdir -p dist/output

HTML_PATH=$(find dist/client -name index.html -path '*/assets' -prune -o -name index.html -print | head -1)
if [ -n "$HTML_PATH" ]; then
  cp "$HTML_PATH" dist/output/index.html
fi

ASSETS_DIR=$(find dist/client -type d -name assets | head -1)
if [ -n "$ASSETS_DIR" ]; then
  cp -r "$ASSETS_DIR" dist/output/assets
fi

# ===== 路径修正：把所有 /app/<appId>/ 前缀替换为 / =====
# 这是 Vercel 部署的核心修复。
# 背景：SDK 在编译时会把 CLIENT_BASE_PATH 硬编码进 JS bundle，用于：
#   1. BrowserRouter basename — 错误的 basename 导致路由全失配，页面空白
#   2. axiosForBackend baseURL — 错误的 baseURL 导致 /api 请求 404
#   3. dataloom / 权限 / runtime 等 SDK 内部路径
# 即使 CLIENT_BASE_PATH=/ 已设，这里仍做 sed 兜底，确保万无一失。

# HTML 中的资源路径
find dist/output -name '*.html' -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +

# JS / CSS 中的硬编码路径（basename、baseURL、SDK 内部路径等）
find dist/output -name '*.js' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +
find dist/output -name '*.css' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +

# ===== Vercel 兼容：__platform__ 占位符 =====
# __platform__ 是 Handlebars 模板变量，在妙搭平台运行时由服务端替换。
# Vercel 上没有这个替换，会导致 JSON.parse('{{{__platform__}}}') 抛错。
# 替换为空对象 {} 让 SDK 优雅降级。
sed -i "s|JSON.parse('{{{__platform__}}}')|{}|g" dist/output/index.html

# ===== Vercel 兼容：SDK 运行时初始化守卫 =====
# 在 SDK 加载前设置全局变量，阻止 SDK 向不存在的平台接口发请求：
#   - window.__FULLSTACK_RUNTIME_INITIALIZED__ = true
#     （SDK runtime/index.js 在模块加载时检查此变量，为 true 则跳过
#      initObservable / initServerLog / initIframeBridge 等所有平台初始化）
#   - window._IS_Spark_RUNTIME = false
#     （旧版 SDK 检查的变量，作为兼容兜底）
# 这样可避免：
#   - POST /spark/app/.../metrics/collect 405
#   - Failed to init time offset: Unexpected token '<'
#   - 其他 __runtime__ / __innerapi__ 端点的 404/HTML 响应
sed -i 's|</head>|<script>window.__FULLSTACK_RUNTIME_INITIALIZED__ = true; window._IS_Spark_RUNTIME = false; window.__BASENAME_OVERRIDE__ = "/";</script></head>|' dist/output/index.html
