# Serenity

我自己的个人博客:几百行自研代码的静态站点生成器 + Markdown 写作。

## 日常使用

写一篇文章:在 `posts/` 里新建一个 `.md` 文件(文件名就是网址),开头按这个格式写:

```markdown
---
title: 文章标题
date: 2026-10-07
tags: [标签一, 标签二]
---

正文……
```

然后:

```bash
node build.js     # 构建到 dist/
node serve.js     # 本地预览 http://localhost:3000
node --test       # 跑测试
```

发布:提交并推送到 GitHub,部署平台会自动重新构建。

## 部署(Vercel 或 Netlify,二选一)

1. 把这个仓库推送到 GitHub
2. 在 Vercel/Netlify 里选择 "Import Git Repository" 连接仓库
3. 构建命令 `node build.js`,发布目录 `dist`(仓库已含配置文件,一般会自动识别)
4. 部署完成后,把 `site.config.js` 里的 `url` 改成真实网址(RSS 需要绝对链接)

## 目录说明

- `posts/` —— 文章,一篇一个 `.md`
- `about.md` —— "关于我"页面内容
- `site.config.js` —— 站点标题、作者、网址
- `static/` —— 样式、主题脚本、图标、头像
- `src/` —— 构建器代码
- `docs/superpowers/` —— 设计文档与实现计划
