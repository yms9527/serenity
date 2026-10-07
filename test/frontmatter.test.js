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
