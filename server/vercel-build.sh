#!/bin/bash
set -e

# ===== Vercel 部署构建脚本 =====
# 将 NestJS 后端（打包为 Vercel Serverless Function）和
# React 前端构建产物组装到 dist/output/，供 Vercel 部署。

# Vercel 部署时应用从域名根路径提供服务（非 /app/<appId>/ 子路径）。
export CLIENT_BASE_PATH=/

npm run build:server
npm run build:client

mkdir -p dist/output

# ===== 复制前端构建产物 =====
# 构建后产物路径固定为 dist/client/index.html + dist/client/assets/
# 不使用 find 动态查找，避免误取原始模板或子目录文件。
BUILD_HTML="dist/client/index.html"
BUILD_ASSETS="dist/client/assets"

if [ ! -f "$BUILD_HTML" ]; then
  echo "[ERROR] 构建产物不存在: $BUILD_HTML" >&2
  ls -la dist/client/ >&2
  exit 1
fi

SCRIPT_COUNT=$(grep -c '<script' "$BUILD_HTML" || true)
if [ "$SCRIPT_COUNT" -lt 3 ]; then
  echo "[ERROR] index.html 不是构建产物（<script 标签数: $SCRIPT_COUNT）" >&2
  head -5 "$BUILD_HTML" >&2
  exit 1
fi

cp "$BUILD_HTML" dist/output/index.html
cp -r "$BUILD_ASSETS" dist/output/assets
[ -f dist/client/favicon.svg ] && cp dist/client/favicon.svg dist/output/favicon.svg

# ===== 模板变量替换 =====
# 构建后的 index.html 保留了 Handlebars 模板变量，Vercel 没有服务端替换环节。
# sed 的 & 在替换字符串中代表"匹配到的文本"，必须转义为 \&。
sed -i \
  -e 's|{{appName}}|37line \&middot; 手帐小世界|g' \
  -e 's|{{appDescription}}|Mina \&amp; Sana 的手帐日记粉丝站|g' \
  -e 's|{{{appAvatar}}}|/favicon.svg|g' \
  -e 's|{{appAvatar}}|/favicon.svg|g' \
  -e 's|{{appId}}|vercel|g' \
  -e 's|{{tenantId}}||g' \
  -e 's|{{userId}}||g' \
  -e 's|{{userName}}||g' \
  -e 's|{{basename}}|/|g' \
  -e 's|{{csrfToken}}||g' \
  -e 's|{{environment}}|production|g' \
  dist/output/index.html

# ===== 路径修正：把所有 /app/<appId>/ 前缀替换为 / =====
find dist/output -name '*.html' -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +
find dist/output -name '*.js' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +
find dist/output -name '*.css' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +

# ===== Vercel 兼容：__platform__ 占位符 =====
sed -i "s|JSON.parse('{{{__platform__}}}')|{}|g" dist/output/index.html

# ===== Vercel 兼容：SDK 运行时初始化守卫 =====
sed -i 's|</head>|<script>window.__FULLSTACK_RUNTIME_INITIALIZED__ = true; window._IS_Spark_RUNTIME = false; window.__BASENAME_OVERRIDE__ = "/";</script></head>|' dist/output/index.html

# ===== 最终验证 =====
echo "=== 构建产物验证 ==="
echo "index.html 大小: $(wc -c < dist/output/index.html) bytes"
echo "<script 标签数: $(grep -c '<script' dist/output/index.html)"
echo "剩余 {{ 模板变量: $(grep -o '{{[^}]*}}' dist/output/index.html | wc -l)"
# 允许 JSON.parse 里的 __platform__，它是 at runtime 的
LEFT=$(grep -c '{{' dist/output/index.html)
echo "剩余 {{ 字符: ${LEFT}"