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
