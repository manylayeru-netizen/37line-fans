#!/bin/bash
set -e

# ===== Vercel 部署构建脚本 =====
# 将 NestJS 后端和 React 前端构建产物组装到 dist/output/，供 Vercel 部署。
# 兼容两种构建产物结构：
#   Vercel 环境:  dist/client/client/index.html + dist/client/assets/
#   沙箱环境:    dist/client/index.html        + dist/client/assets/

export CLIENT_BASE_PATH=/

echo "=== Step 1/7: 构建服务端 ==="
npm run build:server

echo "=== Step 2/7: 构建前端 ==="
npm run build:client

echo "=== Step 3/7: 检查构建产物结构 ==="
echo "dist/client 目录结构:"
find dist/client -maxdepth 2 -type f -o -type d | sort

mkdir -p dist/output

# ===== 定位 index.html =====
BUILD_HTML=""
if [ -f "dist/client/client/index.html" ]; then
  BUILD_HTML="dist/client/client/index.html"
  echo "找到 index.html (Vercel 环境): $BUILD_HTML"
elif [ -f "dist/client/index.html" ]; then
  BUILD_HTML="dist/client/index.html"
  echo "找到 index.html (沙箱环境): $BUILD_HTML"
else
  echo "[ERROR] 未找到 index.html，dist/client 内容:" >&2
  ls -laR dist/client/ >&2
  exit 1
fi

# ===== 定位 assets 目录 =====
BUILD_ASSETS=""
if [ -d "dist/client/assets" ]; then
  BUILD_ASSETS="dist/client/assets"
elif [ -d "dist/client/client/assets" ]; then
  BUILD_ASSETS="dist/client/client/assets"
else
  echo "[ERROR] 未找到 assets 目录" >&2
  exit 1
fi
echo "找到 assets 目录: $BUILD_ASSETS"

# ===== 内容校验：确认是构建产物而非原始模板 =====
SCRIPT_COUNT=$(grep -c '<script' "$BUILD_HTML" || echo 0)
echo "index.html 中 <script> 标签数: $SCRIPT_COUNT"
if [ "$SCRIPT_COUNT" -lt 2 ]; then
  echo "[WARN] index.html 可能不是构建产物，内容前 5 行:" >&2
  head -5 "$BUILD_HTML" >&2
  echo "[WARN] 继续执行（可能是极简构建）" >&2
fi

echo "=== Step 4/7: 复制构建产物到 dist/output ==="
cp "$BUILD_HTML" dist/output/index.html
cp -r "$BUILD_ASSETS" dist/output/assets

if [ -f dist/client/favicon.png ]; then
  cp dist/client/favicon.png dist/output/favicon.png
  echo "已复制 favicon.png"
fi
if [ -f dist/client/favicon.svg ]; then
  cp dist/client/favicon.svg dist/output/favicon.svg
  echo "已复制 favicon.svg"
fi
if [ -f dist/client/routes.json ]; then
  cp dist/client/routes.json dist/output/routes.json
  echo "已复制 routes.json"
fi

echo "=== Step 5/7: 替换模板变量 ==="
# 构建后的 index.html 保留了 Handlebars 模板变量，Vercel 没有服务端替换环节。
# sed 的 & 在替换字符串中代表"匹配到的文本"，必须转义为 \&。
sed -i \
  -e 's|{{appName}}|37line · Mina \& Sana|g' \
  -e 's|{{appDescription}}|Mina \&amp; Sana 的手帐日记粉丝站|g' \
  -e 's|{{{appAvatar}}}|/favicon.png|g' \
  -e 's|{{appAvatar}}|/favicon.png|g' \
  -e 's|{{appId}}|vercel|g' \
  -e 's|{{tenantId}}||g' \
  -e 's|{{userId}}||g' \
  -e 's|{{userName}}||g' \
  -e 's|{{basename}}|/|g' \
  -e 's|{{csrfToken}}||g' \
  -e 's|{{environment}}|production|g' \
  dist/output/index.html

# __platform__ 特殊处理（三重大括号）
sed -i "s|JSON.parse('{{{__platform__}}}')|{}|g" dist/output/index.html

echo "=== Step 6/7: 修正资源路径和注入运行时守卫 ==="

# HTML 中的资源路径修正
find dist/output -name '*.html' -exec sed -i 's|/app/[[:alnum:]_]*/assets/|/assets/|g' {} +

# JS / CSS 中的硬编码路径修正
find dist/output -name '*.js' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +
find dist/output -name '*.css' -exec sed -i 's|/app/[[:alnum:]_]*/|/|g' {} +

# SDK 运行时初始化守卫：阻止向不存在的平台接口发请求
sed -i 's|</head>|<script>window.__FULLSTACK_RUNTIME_INITIALIZED__ = true; window._IS_Spark_RUNTIME = false; window.__BASENAME_OVERRIDE__ = "/";</script></head>|' dist/output/index.html

echo "=== Step 7/7: 构建产物验证 ==="
HTML_SIZE=$(wc -c < dist/output/index.html)
SCRIPT_AFTER=$(grep -c '<script' dist/output/index.html || echo 0)
TEMPLATE_LEFT=$(grep -c '{{' dist/output/index.html || echo 0)
ASSET_COUNT=$(ls dist/output/assets/ 2>/dev/null | wc -l || echo 0)

echo "index.html 大小: ${HTML_SIZE} bytes"
echo "<script> 标签数: ${SCRIPT_AFTER}"
echo "剩余 {{ 模板变量: ${TEMPLATE_LEFT}}"
echo "assets 文件数: ${ASSET_COUNT}"

if [ "$TEMPLATE_LEFT" -gt 0 ]; then
  echo "[WARN] 仍有模板变量未替换:" >&2
  grep -o '{{[^}]*}}' dist/output/index.html | sort -u >&2
fi

echo "=== 构建完成 ==="
