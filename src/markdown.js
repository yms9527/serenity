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
