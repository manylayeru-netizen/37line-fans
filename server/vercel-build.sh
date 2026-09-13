#!/bin/bash
set -e

# Vercel 部署时应用从域名根路径提供服务（非 /app/<appId>/ 子路径）。
# 构建时设 CLIENT_BASE_PATH=/，让 Vite 把 BrowserRouter basename、
# axiosForBackend baseURL、dataloom SDK 路径等全部编译为 /，
# 避免与 Vercel 实际路径不匹配导致路由全失配（页面空白）或 /api 请求 404。
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

# Safety net: if any asset paths still have /app/<id>/ prefix in HTML or JS
# (e.g. from SDK compile-time constants that don't respect CLIENT_BASE_PATH),
# strip them so paths resolve correctly on Vercel (domain root).
find dist/output -name '*.html' -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +
find dist/output -name '*.js' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +

# Vercel compatibility: __platform__ is a Handlebars placeholder that never
# gets replaced on Vercel. Substitute with an empty object so JSON.parse doesn't throw.
sed -i "s|JSON.parse('{{{__platform__}}}')|{}|g" dist/output/index.html

# Vercel compatibility: set runtime guard BEFORE the SDK initializes.
# The SDK's runtime/index.js checks `window.__FULLSTACK_RUNTIME_INITIALIZED__`
# at module load time and skips initObservable / initServerLog / initIframeBridge
# when it's already true. This prevents all /spark/* and __runtime__/* platform
# API calls (observability, time offset, permissions, server logs, etc.) from
# being made on Vercel where those endpoints don't exist.
sed -i 's|</head>|<script>window.__FULLSTACK_RUNTIME_INITIALIZED__ = true; window._IS_Spark_RUNTIME = false;</script></head>|' dist/output/index.html
