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
    next: { slug: 'older', title: '更早的一篇' },
  });
  assert.match(html, /a&lt;b&gt;&amp;c/);
  assert.ok(!html.includes('a<b>&c'));
  assert.match(html, /href="\/posts\/newer\/"/);
  assert.match(html, /href="\/posts\/older\/"/);
  assert.match(html, /上一篇/);
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
