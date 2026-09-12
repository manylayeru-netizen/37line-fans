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

find dist/output -name index.html -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +
