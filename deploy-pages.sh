#!/usr/bin/env bash
# 一键发布:构建站点 → 推送到 GitHub Pages 发布仓库(yms9527/yms9527.github.io)
# 用法:bash deploy-pages.sh
set -e
cd "$(dirname "$0")"

echo "① 构建"
node build.js
touch dist/.nojekyll

echo "② 提交到发布仓库"
NAME="$(git config user.name)"
EMAIL="$(git config user.email)"
cd dist
git init -q -b main
git config user.name "$NAME"
git config user.email "$EMAIL"
git add -A
git commit -qm "deploy: $(date '+%Y-%m-%d %H:%M')" || echo "(内容无变化)"
git remote add origin https://github.com/yms9527/yms9527.github.io.git 2>/dev/null || true

echo "③ 推送"
git push -f origin main

echo "✅ 已发布:https://yms9527.github.io/(约 1 分钟后生效)"
