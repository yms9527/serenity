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
