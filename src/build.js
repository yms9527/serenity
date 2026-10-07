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
    let parsed;
    try {
      parsed = parseFrontmatter(source);
    } catch (err) {
      throw new Error(`[${file}] ${err.message}`);
    }
    const { data, content } = parsed;
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
    await write(`tags/${tag.name}/index.html`, tagPage({ site, tag: tag.name, posts: tag.posts }));
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
