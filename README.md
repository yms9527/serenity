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

发布:运行 `bash deploy-pages.sh`(自动构建并推送到 GitHub Pages,约 1 分钟生效);源码记得照常 `git push`。

## 部署(GitHub Pages)

线上地址:<https://yms9527.github.io/>;发布仓库 `yms9527/yms9527.github.io` 只装构建产物。

一键发布:

```bash
bash deploy-pages.sh   # 构建 → 推送到发布仓库 → 约 1 分钟生效
```

发布前确保 GitHub 能连上(这台电脑上开着 Steam++ 加速即可)。`site.config.js` 里的 `url` 是 RSS 用的绝对网址,以后换域名时改它。

## 目录说明

- `posts/` —— 文章,一篇一个 `.md`
- `about.md` —— "关于我"页面内容
- `site.config.js` —— 站点标题、作者、网址
- `static/` —— 样式、主题脚本、图标、头像
- `src/` —— 构建器代码
- `docs/superpowers/` —— 设计文档与实现计划
