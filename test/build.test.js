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
  assert.match(await read(out, 'tags/动画/index.html'), /测试文章一/);
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

test('中文标签:链接为百分号编码,解码后可读到实际文件', async (t) => {
  const { out } = await buildFixture('site');
  t.after(() => rm(out, { recursive: true, force: true }));
  const html = await read(out, 'index.html');
  assert.match(html, /href="\/tags\/%E5%8A%A8%E7%94%BB\/"/);
  const m = html.match(/href="\/tags\/([^"]+)\/"/);
  assert.ok(m, '首页应有标签链接');
  const dir = decodeURIComponent(m[1]);
  assert.match(await read(out, `tags/${dir}/index.html`), /测试文章一/);
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

test('特殊字符文件名:链接百分号编码,解码后可读到实际文件', async (t) => {
  const { out } = await buildFixture('encoded');
  t.after(() => rm(out, { recursive: true, force: true }));
  const html = await read(out, 'index.html');
  assert.match(html, /href="\/posts\/a%26b\/"/);
  const m = html.match(/href="\/posts\/([^"]+)\/"/);
  assert.ok(m, '首页应有文章链接');
  assert.match(await read(out, `posts/${decodeURIComponent(m[1])}/index.html`), /特殊字符文件名/);
});

test('文章缺 title 时构建失败且报出文件名', async (t) => {
  const out = await mkdtemp(join(tmpdir(), 'serenity-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  await assert.rejects(
    () => build({ rootDir: join(here, 'fixtures', 'bad'), outDir: out }),
    /\[no-title\.md\]/,
  );
});
