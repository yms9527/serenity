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
