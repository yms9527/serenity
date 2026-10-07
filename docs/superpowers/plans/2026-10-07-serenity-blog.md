# Serenity 个人博客 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用约 500 行自研 Node.js 代码,把 Serenity 建成一个可写 Markdown、本地预览、自动测试、Vercel/Netlify 部署的静态个人博客。

**Architecture:** 一个零框架的静态站点生成器。`node build.js` 扫描 `posts/*.md`,解析 front-matter,用 markdown-it 渲染,套用 `src/templates.js` 里的模板函数,输出整站到 `dist/`;`node serve.js` 提供本地预览;`static/` 原样复制。运行时依赖只有 markdown-it。

**Tech Stack:** Node.js 24(ESM)、markdown-it、Node 内置测试运行器(`node --test`)、原生 CSS 变量主题。

**Spec:** `docs/superpowers/specs/2026-10-07-serenity-blog-design.md`

## Global Constraints

- Node.js ≥ 24(本机 v24.21);全部代码用 ESM(`package.json` 里 `"type": "module"`)
- 运行时依赖只允许 `markdown-it` 一个;不加模板引擎、不加构建工具、不加外部字体
- 全站界面文案为中文;HTML 里所有动态文本必须经过转义
- 构建必须显式失败:数据问题(缺字段、非法日期、front-matter 未闭合)打印 `[文件名] 具体问题` 并以非零退出码结束,绝不猜测修正
- 配色沿用 spec:`--bg:#f4f6f8 --card:#ffffff --text:#1b1f24 --muted:#6d7783 --accent:#5f7a56(色块用 #78926f)`;暗色 `--bg:#15181c --card:#1d211c --text:#e2e6ea --muted:#9aa4a0 --accent:#9db392`
- 测试必须用 `node --test`(零依赖);提交信息用中文,结尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`
- 仓库根目录为 `serenity/`(git 已初始化,设计文档已提交,`.gitignore` 已含 `node_modules/` 与 `dist/`)

## Review Focus

以下五类是 spec 隐含、但最容易伤到真实使用的输入,每一类都在对应任务里配了测试:

1. **`posts/` 为空或不存在** → 构建必须成功,首页显示"还没有文章"(Task 5 测试)
2. **标题/摘要含 `& < > "` 等字符** → HTML 与 RSS 中正确转义,不破版、不坏订阅(Task 3 + Task 4 测试)
3. **中文标签** → 标签页落盘路径与页面链接用同一套百分号编码,能互相点开(Task 5 测试)
4. **`draft: true` 的文章** → 首页、标签页、RSS、文章页里都完全不出现,且终端有"已跳过草稿"提示(Task 5 测试)
5. **缺 `title`/`date`、日期非法(`2026/10/07`、`2026-02-30`)** → 构建失败,报错信息含文件名与具体问题(Task 1 测试)

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `package.json` | 项目定义:`type: module`、脚本 `build`/`preview`/`test`、依赖 markdown-it |
| `src/frontmatter.js` | front-matter 解析 + 文章元数据校验(纯函数,无 IO) |
| `src/markdown.js` | markdown-it 封装 + 纯文本摘要截取(纯函数) |
| `site.config.js` | 站点配置:标题、简介、作者、网址、头像 |
| `src/templates.js` | 全部页面模板函数 + 转义 + 日期格式化(纯函数) |
| `src/rss.js` | RSS XML 生成(纯函数) |
| `src/build.js` | 构建主流程:读文件 → 调纯函数 → 写 `dist/`(唯一做 IO 的模块) |
| `build.js`(根) | CLI 入口:`node build.js` |
| `serve.js` | 本地预览静态服务器(node:http) |
| `static/style.css` | 全站样式(亮/暗两套 CSS 变量) |
| `static/theme.js` | 主题切换按钮逻辑 |
| `static/favicon.svg` / `static/avatar.svg` | 站点图标 / 占位头像 |
| `test/*.test.js` | 单元测试与冒烟测试 |
| `test/fixtures/` | 测试用示例站点(不参与 `node --test` 执行,只作数据) |
| `posts/` `about.md` | 内容(用户日常写作的地方) |
| `vercel.json` `netlify.toml` `README.md` | 部署配置与使用说明 |

依赖方向:`build.js → src/build.js → {frontmatter, markdown, templates, rss}`。四个纯函数模块互不依赖,可单独测试。

---

### Task 1: 项目初始化 + front-matter 解析与校验

**Files:**
- Create: `package.json`
- Create: `src/frontmatter.js`
- Test: `test/frontmatter.test.js`

**Interfaces:**
- Consumes: 无(第一个任务)
- Produces:
  - `parseFrontmatter(source: string) → { data: object, content: string }` —— 无 front-matter 时返回 `{ data: {}, content: source }`;块未闭合时抛 `Error`
  - `validatePost(data: object, filename: string) → { title: string, date: string, tags: string[], summary: string|null, draft: boolean }` —— 缺字段或日期非法时抛 `Error`,消息形如 `[a.md] 缺少必填字段 title`
  - `normalizeTags(tags: unknown) → string[]`(去空白、去重、保持顺序)

- [ ] **Step 1: 创建 `package.json` 并安装依赖**

```json
{
  "name": "serenity",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Serenity —— 个人博客",
  "scripts": {
    "build": "node build.js",
    "preview": "node serve.js",
    "test": "node --test"
  },
  "dependencies": {
    "markdown-it": "^14.1.0"
  }
}
```

Run: `npm install`
Expected: 生成 `node_modules/` 与 `package-lock.json`,无报错。

- [ ] **Step 2: 写失败测试 `test/frontmatter.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, validatePost, normalizeTags } from '../src/frontmatter.js';

test('解析基本字段并剥离 front-matter', () => {
  const src = '---\ntitle: 你好\ndate: 2026-10-07\n---\n\n正文第一行';
  const { data, content } = parseFrontmatter(src);
  assert.equal(data.title, '你好');
  assert.equal(data.date, '2026-10-07');
  assert.equal(content, '正文第一行');
});

test('行内数组标签与引号', () => {
  const { data } = parseFrontmatter('---\ntitle: "带:冒号"\ntags: [生活, 随笔]\n---\n正文');
  assert.deepEqual(data.tags, ['生活', '随笔']);
  assert.equal(data.title, '带:冒号');
});

test('没有 front-matter 时原样返回', () => {
  const { data, content } = parseFrontmatter('就是一段普通文字');
  assert.deepEqual(data, {});
  assert.equal(content, '就是一段普通文字');
});

test('front-matter 未闭合时抛错', () => {
  assert.throws(() => parseFrontmatter('---\ntitle: 没有结尾\n正文'), /未闭合/);
});

test('draft 解析为布尔值', () => {
  const { data } = parseFrontmatter('---\ntitle: a\ndate: 2026-01-01\ndraft: true\n---\nx');
  assert.equal(data.draft, true);
});

test('normalizeTags:字符串转数组、去重、去空白', () => {
  assert.deepEqual(normalizeTags('生活'), ['生活']);
  assert.deepEqual(normalizeTags([' a ', 'a', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeTags(undefined), []);
});

test('validatePost 缺 title 报错并含文件名', () => {
  assert.throws(() => validatePost({ date: '2026-10-07' }, 'a.md'), /\[a\.md\].*title/);
});

test('validatePost 缺 date 报错', () => {
  assert.throws(() => validatePost({ title: 'x' }, 'b.md'), /\[b\.md\].*date/);
});

test('validatePost 日期格式错误报错', () => {
  assert.throws(() => validatePost({ title: 'x', date: '2026/10/07' }, 'c.md'), /YYYY-MM-DD/);
});

test('validatePost 不存在的日期报错', () => {
  assert.throws(() => validatePost({ title: 'x', date: '2026-02-30' }, 'd.md'), /不是有效日期/);
});

test('validatePost 通过时返回规范化的元数据', () => {
  const meta = validatePost({ title: 'x', date: '2026-10-07', tags: ['生活'] }, 'e.md');
  assert.deepEqual(meta, { title: 'x', date: '2026-10-07', tags: ['生活'], summary: null, draft: false });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test test/frontmatter.test.js`
Expected: FAIL,报错含 `Cannot find module`(src/frontmatter.js 尚未创建)。

- [ ] **Step 4: 实现 `src/frontmatter.js`**

```js
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFrontmatter(source) {
  const text = String(source).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { data: {}, content: text };

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) throw new Error('front-matter 未闭合(缺少结尾的 ---)');

  const data = {};
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) throw new Error(`front-matter 行无法解析:"${line}"`);
    data[line.slice(0, idx).trim()] = parseValue(line.slice(idx + 1).trim());
  }
  const content = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { data, content };
}

function parseValue(raw) {
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
  }
  return unquote(raw);
}

function unquote(s) {
  const quoted = (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"));
  return quoted ? s.slice(1, -1) : s;
}

export function normalizeTags(tags) {
  if (tags == null || tags === '') return [];
  const arr = Array.isArray(tags) ? tags : [tags];
  return [...new Set(arr.map((t) => String(t).trim()).filter(Boolean))];
}

export function validatePost(data, filename) {
  if (!data.title) throw new Error(`[${filename}] 缺少必填字段 title`);
  if (!data.date) throw new Error(`[${filename}] 缺少必填字段 date`);
  const date = String(data.date);
  if (!DATE_RE.test(date)) {
    throw new Error(`[${filename}] date 格式应为 YYYY-MM-DD,实际为 "${date}"`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`[${filename}] date 不是有效日期:"${date}"`);
  }
  return {
    title: String(data.title),
    date,
    tags: normalizeTags(data.tags),
    summary: data.summary ? String(data.summary) : null,
    draft: data.draft === true,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test test/frontmatter.test.js`
Expected: PASS,11 个测试全过。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json src/frontmatter.js test/frontmatter.test.js
git commit -m "feat: front-matter 解析与文章校验

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Markdown 渲染与摘要截取

**Files:**
- Create: `src/markdown.js`
- Test: `test/markdown.test.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - `renderMarkdown(source: string) → string`(HTML;允许内嵌 HTML,自动识别链接)
  - `makeExcerpt(source: string, maxLen = 60) → string`(去 Markdown 标记的纯文本;超长时截断并追加 `……`)

- [ ] **Step 1: 写失败测试 `test/markdown.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, makeExcerpt } from '../src/markdown.js';

test('渲染标题与段落', () => {
  const html = renderMarkdown('# 标题\n\n一段正文。');
  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<p>一段正文。<\/p>/);
});

test('允许内嵌 HTML(用于贴自己的 SVG 动画)', () => {
  const html = renderMarkdown('<svg viewBox="0 0 10 10"><circle r="5"/></svg>');
  assert.match(html, /<svg/);
});

test('摘要去除 Markdown 标记', () => {
  const text = makeExcerpt('## 小标题\n\n这是**加粗**和[链接](https://example.com)的文字。');
  assert.equal(text, '小标题 这是加粗和链接的文字。');
});

test('摘要去除代码块与图片', () => {
  const text = makeExcerpt('![图片](/a.png)\n\n```js\nconsole.log(1)\n```\n\n后面的正文。');
  assert.equal(text, '后面的正文。');
});

test('摘要超长截断并加省略号', () => {
  const long = '一'.repeat(80);
  const text = makeExcerpt(long, 60);
  assert.equal(text.length, 60 + 2);
  assert.ok(text.endsWith('……'));
});

test('摘要不超长时原样返回', () => {
  assert.equal(makeExcerpt('短句。', 60), '短句。');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/markdown.test.js`
Expected: FAIL,`Cannot find module`。

- [ ] **Step 3: 实现 `src/markdown.js`**

```js
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, linkify: true });

export function renderMarkdown(source) {
  return md.render(String(source));
}

export function makeExcerpt(source, maxLen = 60) {
  const plain = String(source)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...plain];
  if (chars.length <= maxLen) return plain;
  return chars.slice(0, maxLen).join('') + '……';
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/markdown.test.js`
Expected: PASS,6 个测试全过。

- [ ] **Step 5: 提交**

```bash
git add src/markdown.js test/markdown.test.js
git commit -m "feat: Markdown 渲染与摘要截取

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 站点配置与页面模板

**Files:**
- Create: `site.config.js`
- Create: `src/templates.js`
- Test: `test/templates.test.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - 页面函数(全部返回完整 HTML 字符串):
    - `homePage({ site, posts })`
    - `postPage({ site, post, prev, next })` —— `prev` 为**更新**的一篇、`next` 为**更早**的一篇,可为 `null`
    - `tagsPage({ site, tags })` —— `tags: [{ name, count }]`
    - `tagPage({ site, tag, posts })` —— `tag` 为字符串
    - `aboutPage({ site, html })`
    - `notFoundPage({ site })`
  - 工具函数:`escapeHtml(s) → string`、`formatDate('2026-10-07') → '2026年10月7日'`
  - `post` 对象的形状(全项目统一):`{ slug, title, date, tags, excerpt, html }`
  - `site` 对象的形状:`{ title, description, author, url, avatar }`

- [ ] **Step 1: 创建 `site.config.js`**

```js
export default {
  title: 'Serenity',
  description: '安静的地方,写点东西。',
  author: '初',
  // 部署后改成真实网址(RSS 里的链接需要绝对地址)
  url: 'https://serenity.example.com',
  avatar: '/avatar.svg',
};
```

- [ ] **Step 2: 写失败测试 `test/templates.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml, formatDate, homePage, postPage, tagsPage, tagPage, aboutPage, notFoundPage,
} from '../src/templates.js';

const site = { title: 'Serenity', description: '安静的地方。', author: '初', url: 'https://s.example.com', avatar: '/avatar.svg' };
const post = { slug: 'hello', title: '你好', date: '2026-10-07', tags: ['生活'], excerpt: '摘要', html: '<p>正文</p>' };

test('escapeHtml 转义五个字符', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('formatDate 中文格式', () => {
  assert.equal(formatDate('2026-10-07'), '2026年10月7日');
});

test('首页包含标题、文章卡片与站点名', () => {
  const html = homePage({ site, posts: [post] });
  assert.match(html, /<a href="\/posts\/hello\/">你好<\/a>/);
  assert.match(html, /Serenity/);
  assert.match(html, /<a class="tag" href="\/tags\/%E7%94%9F%E6%B4%BB\/">生活<\/a>/);
});

test('首页无文章时给空状态文案', () => {
  const html = homePage({ site, posts: [] });
  assert.match(html, /还没有文章/);
});

test('文章页转义标题并含上下篇导航', () => {
  const html = postPage({
    site,
    post: { ...post, title: 'a<b>&c' },
    prev: { slug: 'newer', title: '更新的一篇' },
    next: null,
  });
  assert.match(html, /a&lt;b&gt;&amp;c/);
  assert.ok(!html.includes('a<b>&c'));
  assert.match(html, /href="\/posts\/newer\/"/);
  assert.match(html, /下一篇/);
});

test('页面内联防闪主题脚本与样式引用', () => {
  const html = homePage({ site, posts: [] });
  assert.match(html, /localStorage\.getItem\('theme'\)/);
  assert.match(html, /href="\/style.css"/);
  assert.match(html, /src="\/theme\.js"/);
});

test('标签总览页显示计数', () => {
  const html = tagsPage({ site, tags: [{ name: '生活', count: 2 }] });
  assert.match(html, /生活/);
  assert.match(html, />2</);
});

test('标签页转义标签名', () => {
  const html = tagPage({ site, tag: 'a<b', posts: [post] });
  assert.ok(!html.includes('a<b'));
});

test('关于页渲染 html', () => {
  assert.match(aboutPage({ site, html: '<p>我是初</p>' }), /我是初/);
});

test('404 页含回首页链接', () => {
  const html = notFoundPage({ site });
  assert.match(html, /找不到/);
  assert.match(html, /href="\/"/);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test test/templates.test.js`
Expected: FAIL,`Cannot find module`。

- [ ] **Step 4: 实现 `src/templates.js`**

```js
const THEME_BOOT_SCRIPT =
  `(function(){try{var t=localStorage.getItem('theme');` +
  `if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}` +
  `document.documentElement.dataset.theme=t;}catch(e){}})();`;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

function navLink(href, label, active) {
  return `<a href="${href}"${active ? ' class="active"' : ''}>${label}</a>`;
}

function metaLine(post) {
  const tags = post.tags
    .map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t)}/">${escapeHtml(t)}</a>`)
    .join('');
  return `<p class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time>${tags}</p>`;
}

export function layout({ site, title, description, body, active = '' }) {
  const pageTitle = title ? `${escapeHtml(title)} · ${escapeHtml(site.title)}` : escapeHtml(site.title);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${escapeHtml(description || site.description)}">
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/style.css">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="/rss.xml">
<script>${THEME_BOOT_SCRIPT}</script>
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/"><span class="logo">S</span>${escapeHtml(site.title)}</a>
    <nav class="nav">${navLink('/', '文章', active === 'posts')}${navLink('/tags/', '标签', active === 'tags')}${navLink('/about/', '关于', active === 'about')}</nav>
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="切换亮暗主题">🌙</button>
  </div>
</header>
<main class="wrap">${body}</main>
<footer class="site-footer"><div class="wrap">© ${new Date().getFullYear()} ${escapeHtml(site.author)} · <a href="/rss.xml">RSS</a></div></footer>
<script src="/theme.js"></script>
</body>
</html>`;
}

function postCard(post) {
  return `<article class="post-card">
<h2 class="card-title"><a href="/posts/${post.slug}/">${escapeHtml(post.title)}</a></h2>
${metaLine(post)}
<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
</article>`;
}

export function homePage({ site, posts }) {
  const list = posts.length
    ? posts.map(postCard).join('\n')
    : '<p class="empty">还没有文章。去 posts/ 文件夹里写下第一篇吧。</p>';
  return layout({ site, active: 'posts', body: `<section class="post-list">\n${list}\n</section>` });
}

export function postPage({ site, post, prev, next }) {
  const nav = `<nav class="post-nav">
${prev ? `<a class="prev" href="/posts/${prev.slug}/">← 上一篇:${escapeHtml(prev.title)}</a>` : '<span></span>'}
${next ? `<a class="next" href="/posts/${next.slug}/">下一篇:${escapeHtml(next.title)} →</a>` : '<span></span>'}
</nav>`;
  const body = `<article class="post">
<h1 class="post-title">${escapeHtml(post.title)}</h1>
${metaLine(post)}
<div class="post-content">${post.html}</div>
</article>
${nav}`;
  return layout({ site, title: post.title, description: post.excerpt, active: 'posts', body });
}

export function tagsPage({ site, tags }) {
  const items = tags
    .map((t) => `<li><a href="/tags/${encodeURIComponent(t.name)}/">${escapeHtml(t.name)}</a><span class="count">${t.count}</span></li>`)
    .join('\n');
  const body = `<section class="tags-page">
<h1 class="page-title">标签</h1>
<ul class="tag-list">${items || '<li class="empty">还没有标签。</li>'}</ul>
</section>`;
  return layout({ site, title: '标签', active: 'tags', body });
}

export function tagPage({ site, tag, posts }) {
  const list = posts.map(postCard).join('\n');
  const body = `<section class="post-list">
<h1 class="page-title">标签:${escapeHtml(tag)}</h1>
${list}
</section>`;
  return layout({ site, title: `标签:${tag}`, active: 'tags', body });
}

export function aboutPage({ site, html }) {
  const body = `<article class="post">
<h1 class="post-title">关于我</h1>
<div class="post-content">${html}</div>
</article>`;
  return layout({ site, title: '关于我', active: 'about', body });
}

export function notFoundPage({ site }) {
  const body = `<section class="not-found">
<h1 class="page-title">找不到这个页面</h1>
<p>它可能被移走了,或者从来就不存在。</p>
<p><a href="/">← 回首页</a></p>
</section>`;
  return layout({ site, title: '404', body });
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test test/templates.test.js`
Expected: PASS,10 个测试全过。

- [ ] **Step 6: 提交**

```bash
git add site.config.js src/templates.js test/templates.test.js
git commit -m "feat: 站点配置与页面模板

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: RSS 生成

**Files:**
- Create: `src/rss.js`
- Test: `test/rss.test.js`

**Interfaces:**
- Consumes: `post` 形状来自 Task 3(`{ slug, title, date, tags, excerpt, html }`)
- Produces:
  - `buildRss({ site, posts }) → string`(完整 RSS 2.0 XML;每篇输出摘要 `<description>` 与全文 `<content:encoded>`)
  - `escapeXml(s) → string`
  - `rfc822('2026-10-07') → 'Wed, 07 Oct 2026 00:00:00 GMT'`

- [ ] **Step 1: 写失败测试 `test/rss.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRss, escapeXml, rfc822 } from '../src/rss.js';

const site = { title: 'Serenity & 我', description: '<安静>', author: '初', url: 'https://s.example.com', avatar: '/avatar.svg' };
const post = { slug: 'hello', title: '你好 & 再见', date: '2026-10-07', tags: [], excerpt: '摘要 <带尖括号>', html: '<p>全文。就是这里。</p>' };

test('escapeXml 转义特殊字符', () => {
  assert.equal(escapeXml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('rfc822 生成 GMT 时间', () => {
  assert.equal(rfc822('2026-10-07'), 'Wed, 07 Oct 2026 00:00:00 GMT');
});

test('RSS 含频道信息与转义后的标题', () => {
  const xml = buildRss({ site, posts: [post] });
  assert.match(xml, /<title>Serenity &amp; 我<\/title>/);
  assert.match(xml, /<title>你好 &amp; 再见<\/title>/);
  assert.match(xml, /<link>https:\/\/s\.example\.com\/posts\/hello\/<\/link>/);
  assert.match(xml, /<pubDate>Wed, 07 Oct 2026 00:00:00 GMT<\/pubDate>/);
});

test('RSS 输出全文 content:encoded', () => {
  const xml = buildRss({ site, posts: [post] });
  assert.match(xml, /<content:encoded><!\[CDATA\[<p>全文。就是这里。<\/p>\]\]><\/content:encoded>/);
});

test('正文含 ]]> 时不会破坏 CDATA', () => {
  const tricky = { ...post, html: '<p>a]]>b</p>' };
  const xml = buildRss({ site, posts: [tricky] });
  assert.ok(xml.includes(']]]]><![CDATA[>'));
});

test('没有文章时也能生成合法 RSS', () => {
  const xml = buildRss({ site, posts: [] });
  assert.match(xml, /<rss version="2.0"/);
  assert.ok(!xml.includes('<item>'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/rss.test.js`
Expected: FAIL,`Cannot find module`。

- [ ] **Step 3: 实现 `src/rss.js`**

```js
export function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function rfc822(dateIso) {
  return new Date(`${dateIso}T00:00:00Z`).toUTCString();
}

function cdata(html) {
  return `<![CDATA[${String(html).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

export function buildRss({ site, posts }) {
  const items = posts.map((p) => {
    const url = `${site.url}/posts/${encodeURIComponent(p.slug)}/`;
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      <content:encoded>${cdata(p.html)}</content:encoded>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(site.url)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/rss.test.js`
Expected: PASS,6 个测试全过。

- [ ] **Step 5: 提交**

```bash
git add src/rss.js test/rss.test.js
git commit -m "feat: RSS 生成

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 构建主流程(build.js)

**Files:**
- Create: `build.js`(根目录 CLI 入口)
- Create: `src/build.js`
- Test: `test/build.test.js`
- Create: `test/fixtures/site/site.config.js`、`test/fixtures/site/about.md`、`test/fixtures/site/posts/*.md`
- Create: `test/fixtures/empty/site.config.js`

**Interfaces:**
- Consumes: Task 1-4 的全部导出(`parseFrontmatter`/`validatePost`、`renderMarkdown`/`makeExcerpt`、模板函数、`buildRss`)
- Produces:
  - `build({ rootDir = process.cwd(), outDir } = {}) → Promise<{ postCount, tagCount, outDir }>`
  - `dist/` 目录结构:`index.html`、`posts/<slug>/index.html`、`tags/index.html`、`tags/<编码标签>/index.html`、`about/index.html`、`404.html`、`rss.xml`、`static/` 内容
  - 构建错误:抛出 `Error`(消息含 `[文件名] 问题`)

- [ ] **Step 1: 创建测试夹具**

`test/fixtures/site/site.config.js`:
```js
export default {
  title: '测试站',
  description: '用于测试',
  author: '测试',
  url: 'https://test.example.com',
  avatar: '/avatar.svg',
};
```

`test/fixtures/site/about.md`:
```markdown
---
title: 关于我
---

我是**测试**用的关于页。
```

`test/fixtures/site/posts/hello.md`:
```markdown
---
title: 测试文章一
date: 2026-10-05
tags: [动画, 生活]
---

正文里有 <em>HTML</em> 和 `code`。
```

`test/fixtures/site/posts/second-post.md`:
```markdown
---
title: 测试文章二
date: 2026-10-07
tags: [动画]
summary: 自定义摘要
---

第二篇的正文。
```

`test/fixtures/site/posts/draft-post.md`:
```markdown
---
title: 草稿不该出现
date: 2026-10-06
draft: true
---

这是草稿。
```

`test/fixtures/empty/site.config.js`(与上面站点配置相同内容,无 posts 目录、无 static 目录)

- [ ] **Step 2: 写失败测试 `test/build.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';

const here = dirname(fileURLToPath(import.meta.url));

async function buildFixture(name) {
  const out = await mkdtemp(join(tmpdir(), 'serenity-'));
  const result = await build({ rootDir: join(here, 'fixtures', name), outDir: out });
  return { out, result };
}

async function read(out, rel) {
  return readFile(join(out, rel), 'utf8');
}

test('构建生成全部页面', async (t) => {
  const { out, result } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));

  assert.equal(result.postCount, 2);
  assert.equal(result.tagCount, 2);

  assert.match(await read(out, 'index.html'), /测试文章一/);
  assert.match(await read(out, 'posts/hello/index.html'), /正文里有/);
  assert.match(await read(out, 'tags/index.html'), /动画/);
  assert.match(await read(out, 'tags/%E5%8A%A8%E7%94%BB/index.html'), /测试文章一/);
  assert.match(await read(out, 'about/index.html'), /关于页/);
  assert.match(await read(out, '404.html'), /找不到/);

  const rss = await read(out, 'rss.xml');
  assert.match(rss, /<title>测试文章一<\/title>/);
  assert.match(rss, /https:\/\/test\.example\.com\/posts\/hello\//);
});

test('文章按日期倒序,首页第一篇是最新', async (t) => {
  const { out } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));
  const html = await read(out, 'index.html');
  assert.ok(html.indexOf('测试文章二') < html.indexOf('测试文章一'));
});

test('中文标签的页面路径与链接编码一致', async (t) => {
  const { out } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));
  const html = await read(out, 'index.html');
  assert.match(html, /href="\/tags\/%E5%8A%A8%E7%94%BB\/"/);
});

test('draft 文章完全不出现在产出中', async (t) => {
  const { out } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));
  assert.ok(!(await read(out, 'index.html')).includes('草稿不该出现'));
  assert.ok(!(await read(out, 'rss.xml')).includes('草稿不该出现'));
  await assert.rejects(read(out, 'posts/draft-post/index.html'));
});

test('上半篇/下半篇导航:文章页含另一篇的链接', async (t) => {
  const { out } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));
  // second-post 更新,hello 页面里的"上一篇"应指向 second-post
  const hello = await read(out, 'posts/hello/index.html');
  assert.match(hello, /href="\/posts\/second-post\/"/);
});

test('posts 为空时构建成功并显示空状态', async (t) => {
  const { out } = await buildFixture('empty');
  t.after(() => rm(out, { recursive: true, force: true }));
  assert.match(await read(out, 'index.html'), /还没有文章/);
  assert.match(await read(out, 'rss.xml'), /<rss version="2.0"/);
});

test('文章缺 title 时构建失败且报出文件名', async (t) => {
  const out = await mkdtemp(join(tmpdir(), 'serenity-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  await assert.rejects(
    () => build({ rootDir: join(here, 'fixtures', 'bad'), outDir: out }),
    /\[no-title\.md\]/,
  );
});
```

注意最后一个测试需要 `test/fixtures/bad/` 夹具,请在 Step 1 一并创建:

`test/fixtures/bad/site.config.js`(内容同 `empty` 的配置)、`test/fixtures/bad/posts/no-title.md`:
```markdown
---
date: 2026-10-07
---

没有标题的文章。
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test test/build.test.js`
Expected: FAIL,`Cannot find module '../src/build.js'`。

- [ ] **Step 4: 实现 `src/build.js`**

```js
import { readdir, readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter, validatePost } from './frontmatter.js';
import { renderMarkdown, makeExcerpt } from './markdown.js';
import { homePage, postPage, tagsPage, tagPage, aboutPage, notFoundPage } from './templates.js';
import { buildRss } from './rss.js';

async function loadPosts(postsDir) {
  let files = [];
  try {
    files = await readdir(postsDir);
  } catch {
    return [];
  }
  const posts = [];
  for (const file of files.filter((f) => f.endsWith('.md')).sort()) {
    const source = await readFile(join(postsDir, file), 'utf8');
    const { data, content } = parseFrontmatter(source);
    const meta = validatePost(data, file);
    if (meta.draft) {
      console.log(`已跳过草稿: ${file}`);
      continue;
    }
    posts.push({
      ...meta,
      slug: file.replace(/\.md$/, ''),
      excerpt: meta.summary || makeExcerpt(content, 60),
      html: renderMarkdown(content),
    });
  }
  posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug, 'zh') : a.date < b.date ? 1 : -1));
  return posts;
}

function groupTags(posts) {
  const map = new Map();
  for (const p of posts) {
    for (const t of p.tags) {
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(p);
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, count: list.length, posts: list }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
}

export async function build({ rootDir = process.cwd(), outDir } = {}) {
  const out = outDir || join(rootDir, 'dist');
  const site = (await import(pathToFileURL(join(rootDir, 'site.config.js')).href)).default;

  const posts = await loadPosts(join(rootDir, 'posts'));
  const tags = groupTags(posts);

  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, 'posts'), { recursive: true });

  const write = async (rel, content) => {
    const file = join(out, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content, 'utf8');
  };

  await write('index.html', homePage({ site, posts }));

  for (let i = 0; i < posts.length; i++) {
    await write(`posts/${posts[i].slug}/index.html`, postPage({
      site,
      post: posts[i],
      prev: posts[i - 1] || null, // 更新的一篇(列表里在上面)
      next: posts[i + 1] || null, // 更早的一篇
    }));
  }

  await write('tags/index.html', tagsPage({ site, tags }));
  for (const tag of tags) {
    await write(`tags/${encodeURIComponent(tag.name)}/index.html`, tagPage({ site, tag: tag.name, posts: tag.posts }));
  }

  const aboutSource = await readFile(join(rootDir, 'about.md'), 'utf8').catch(() => '');
  await write('about/index.html', aboutPage({ site, html: renderMarkdown(parseFrontmatter(aboutSource).content) }));

  await write('404.html', notFoundPage({ site }));
  await write('rss.xml', buildRss({ site, posts }));

  try {
    await cp(join(rootDir, 'static'), out, { recursive: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  console.log(`构建完成:${posts.length} 篇文章、${tags.length} 个标签 → ${out}`);
  return { postCount: posts.length, tagCount: tags.length, outDir: out };
}
```

- [ ] **Step 5: 实现根目录 CLI 入口 `build.js`**

```js
import { build } from './src/build.js';

try {
  await build();
} catch (err) {
  console.error(`构建失败:${err.message}`);
  process.exit(1);
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `node --test test/build.test.js`
Expected: PASS,7 个测试全过(草稿提示会打印在输出里)。

- [ ] **Step 7: 提交**

```bash
git add build.js src/build.js test/build.test.js test/fixtures
git commit -m "feat: 构建主流程与冒烟测试

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 样式、主题切换、图标与本地预览

**Files:**
- Create: `static/style.css`、`static/theme.js`、`static/favicon.svg`、`static/avatar.svg`
- Create: `serve.js`

**Interfaces:**
- Consumes: Task 3 模板产出的 class 名与 `id="theme-toggle"`、`data-theme` 属性
- Produces: `node serve.js` 在 `http://localhost:3000` 提供 `dist/`(目录访问自动找 `index.html`,找不到回退 `404.html`)

- [ ] **Step 1: 创建 `static/style.css`**

```css
:root {
  --bg: #f4f6f8;
  --card: #ffffff;
  --text: #1b1f24;
  --muted: #6d7783;
  --faint: #98a1ad;
  --accent: #5f7a56;
  --accent-block: #78926f;
  --accent-soft: #eef2ec;
  --border: rgba(21, 33, 50, 0.08);
  --shadow: 0 1px 2px rgba(21, 33, 50, 0.06);
}

[data-theme="dark"] {
  --bg: #15181c;
  --card: #1d211c;
  --text: #e2e6ea;
  --muted: #9aa4a0;
  --faint: #7d8794;
  --accent: #9db392;
  --accent-block: #9db392;
  --accent-soft: #252d24;
  --border: rgba(255, 255, 255, 0.07);
  --shadow: none;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif;
  line-height: 1.7;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.wrap { max-width: 680px; margin: 0 auto; padding: 0 20px; }

/* 顶栏 */
.site-header { padding: 18px 0 0; }
.header-inner { display: flex; align-items: center; gap: 18px; }
.brand { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 600; color: var(--text); }
.brand:hover { text-decoration: none; }
.logo {
  width: 22px; height: 22px; border-radius: 6px; background: var(--accent-block);
  color: #fff; font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.nav { margin-left: auto; display: flex; gap: 16px; font-size: 14px; }
.nav a { color: var(--muted); }
.nav a.active { color: var(--text); font-weight: 600; }
.theme-toggle {
  border: none; background: none; cursor: pointer; font-size: 15px;
  padding: 4px 6px; border-radius: 8px; line-height: 1;
}
.theme-toggle:hover { background: var(--accent-soft); }

/* 列表 */
main { padding: 28px 0 8px; }
.post-list { display: flex; flex-direction: column; gap: 14px; }
.post-card {
  background: var(--card); border-radius: 12px; padding: 18px 20px;
  box-shadow: var(--shadow); border: 1px solid var(--border);
}
.card-title { margin: 0 0 6px; font-size: 17px; line-height: 1.5; }
.card-title a { color: var(--text); }
.post-meta { margin: 0 0 8px; font-size: 12.5px; color: var(--faint); display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
.tag {
  background: var(--accent-soft); color: var(--accent);
  border-radius: 999px; padding: 1px 10px; font-size: 11.5px;
}
.post-excerpt { margin: 0; color: var(--muted); font-size: 14px; }

/* 页标题与空状态 */
.page-title { font-size: 20px; margin: 0 0 18px; }
.empty { color: var(--muted); }
.not-found { padding: 40px 0; }

/* 标签总览 */
.tag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.tag-list li {
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  padding: 12px 18px; display: flex; justify-content: space-between; box-shadow: var(--shadow);
}
.tag-list .count { color: var(--faint); font-size: 13px; }

/* 文章页 */
.post {
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  padding: 28px 26px; box-shadow: var(--shadow);
}
.post-title { margin: 0 0 10px; font-size: 24px; line-height: 1.45; }

.post-content { font-size: 17px; line-height: 1.8; margin-top: 18px; }
.post-content p { margin: 0 0 1.1em; }
.post-content h2 { font-size: 20px; margin: 1.6em 0 0.6em; }
.post-content h3 { font-size: 17.5px; margin: 1.4em 0 0.5em; }
.post-content ul, .post-content ol { padding-left: 1.4em; margin: 0 0 1.1em; }
.post-content li { margin-bottom: 0.35em; }
.post-content blockquote {
  margin: 0 0 1.1em; padding: 2px 16px; border-left: 3px solid var(--accent-block);
  color: var(--muted); background: var(--accent-soft); border-radius: 0 8px 8px 0;
}
.post-content code {
  font-family: ui-monospace, Consolas, "Courier New", monospace;
  font-size: 0.92em; background: var(--accent-soft); border-radius: 5px; padding: 1px 6px;
}
.post-content pre {
  background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 14px 16px; overflow-x: auto; margin: 0 0 1.1em;
}
.post-content pre code { background: none; padding: 0; font-size: 13.5px; line-height: 1.6; }
.post-content img { max-width: 100%; border-radius: 8px; }
.post-content hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.post-content table { border-collapse: collapse; width: 100%; margin: 0 0 1.1em; font-size: 14.5px; }
.post-content th, .post-content td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }

/* 上下篇 */
.post-nav { display: flex; justify-content: space-between; gap: 14px; margin: 18px 0 0; font-size: 13.5px; }

/* 页脚 */
.site-footer { padding: 28px 0 36px; color: var(--faint); font-size: 12.5px; text-align: center; }

@media (max-width: 480px) {
  .post { padding: 20px 18px; }
  .post-title { font-size: 21px; }
  .header-inner { gap: 12px; }
  .post-nav { flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 2: 创建 `static/theme.js`**

```js
(function () {
  var btn = document.getElementById('theme-toggle');

  function stored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function render(newTheme) {
    document.documentElement.dataset.theme = newTheme;
    if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }

  function save(t) {
    try { localStorage.setItem('theme', t); } catch (e) { /* 忽略 */ }
  }

  if (btn) {
    btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', function () {
      render(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      save(document.documentElement.dataset.theme);
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!stored()) render(e.matches ? 'dark' : 'light');
  });
})();
```

- [ ] **Step 3: 创建 `static/favicon.svg` 与 `static/avatar.svg`**

`static/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#78926f"/>
  <text x="32" y="44" font-family="system-ui, 'Segoe UI', sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">S</text>
</svg>
```

`static/avatar.svg`(占位头像,"关于我"页和 README 里可引用;以后换成自己的照片时把新文件放进 `static/` 并改 `site.config.js` 的 `avatar`):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="100" fill="#78926f"/>
  <text x="100" y="130" font-family="'Microsoft YaHei', sans-serif" font-size="84" fill="#ffffff" text-anchor="middle">初</text>
</svg>
```

- [ ] **Step 4: 创建 `serve.js`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = join(import.meta.dirname, 'dist');
const port = Number(process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.xml': 'application/rss+xml; charset=utf-8',
  '.ico': 'image/x-icon',
};

async function tryRead(file) {
  try { return await readFile(file); } catch { return null; }
}

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root + sep) && filePath !== root) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const direct = await tryRead(filePath);
    if (direct) {
      res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(direct);
      return;
    }
    const index = await tryRead(join(filePath, 'index.html'));
    if (index) {
      res.writeHead(200, { 'Content-Type': TYPES['.html'] });
      res.end(index);
      return;
    }
    const notFound = await tryRead(join(root, '404.html'));
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(notFound || 'Not Found');
  } catch {
    res.writeHead(500).end('Server Error');
  }
}).listen(port, () => {
  console.log(`预览地址: http://localhost:${port}`);
});
```

- [ ] **Step 5: 构建并手动验证**

Run: `node build.js && node serve.js`
然后浏览器打开 `http://localhost:3000`,逐项检查:

- 首页显示三张卡片风格的区域(浅灰底、白卡、鼠尾草绿的标签圆片)
- 右上角 🌙 按钮可切换亮/暗,刷新后保持选择
- 打开 `/tags/`、`/tags/动画/`、`/about/`、一个不存在的路径(应显示 404 页)
- 窄窗口(手机宽度)下布局不错乱

确认后 `Ctrl+C` 停掉服务。

- [ ] **Step 6: 提交**

```bash
git add static serve.js
git commit -m "feat: 样式、主题切换、图标与本地预览

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: 首篇文章、关于页、README 与部署配置

**Files:**
- Create: `posts/hello-serenity.md`
- Create: `about.md`
- Create: `README.md`
- Create: `vercel.json`、`netlify.toml`

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 可部署的完整仓库

- [ ] **Step 1: 写第一篇文章 `posts/hello-serenity.md`**

```markdown
---
title: 你好,Serenity
date: 2026-10-07
tags: [随笔]
summary: 这个博客的第一篇文章 —— 它是怎么来的,以及以后这里会写什么。
---

这里是 **Serenity** —— 我自己的写作角落。

它没有用任何现成的博客框架:整站是几百行我自己能读懂的代码,
文章是一个个 Markdown 文件。想改哪里,就改哪里。

以后大概会写这些东西:

- 做动画的小笔记(比如一只骑自行车的鹈鹕是怎么画出来的)
- 生活里值得记下来的小事
- 偶尔的技术碎碎念

如果你是通过 RSS 订阅看到这篇的,欢迎常来。
```

- [ ] **Step 2: 写 `about.md`**

```markdown
---
title: 关于我
---

![头像](/avatar.svg)

你好,我是**初**。

这里是我的个人博客 —— 用来放作品、随笔和想法。

- 联系我:(写上你的邮箱或社交账号)
- RSS:[/rss.xml](/rss.xml)

> 这段文字在仓库根目录的 `about.md` 里,随时可以改成你自己的样子。
```

- [ ] **Step 3: 写 `README.md`**

````markdown
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
````

- [ ] **Step 4: 创建 `vercel.json` 与 `netlify.toml`**

`vercel.json`:
```json
{
  "buildCommand": "node build.js",
  "outputDirectory": "dist",
  "trailingSlash": true
}
```

`netlify.toml`:
```toml
[build]
  command = "node build.js"
  publish = "dist"
```

- [ ] **Step 5: 端到端验证**

Run: `node --test && node build.js`
Expected: 全部测试通过;构建输出 `构建完成:1 篇文章、1 个标签`,且 `dist/index.html` 含"你好,Serenity"、`dist/about/index.html` 含"我是"、`dist/rss.xml` 含该文章全文。

- [ ] **Step 6: 提交**

```bash
git add posts about.md README.md vercel.json netlify.toml
git commit -m "feat: 首篇文章、关于页、README 与部署配置

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## 收尾(计划外的说明)

Task 7 之后,仓库在本机已完整可用。**推送到 GitHub 并连接 Vercel/Netlify 需要你的 GitHub 账号**,这一步要你亲自操作(或在你的授权下由我协助执行),按 README 的"部署"小节走即可。
