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

# Vercel compatibility: tell the SDK this is NOT a Spark runtime, so it
# skips platform API calls (/spark/*, __runtime__/*, permissions, etc.)
# that don't exist on Vercel and would return HTML (SPA fallback).
sed -i 's|</head>|<script>window._IS_Spark_RUNTIME = false;</script></head>|' dist/output/index.html
