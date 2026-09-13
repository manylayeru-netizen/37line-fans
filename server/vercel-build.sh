#!/bin/bash
set -e

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

# Fix asset paths: /app/<appId>/assets/ -> /assets/
find dist/output -name index.html -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +

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
