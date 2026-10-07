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
