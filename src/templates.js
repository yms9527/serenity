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
