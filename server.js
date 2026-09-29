import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proxyClaude } from './netlify/functions/claude.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.mmd': 'text/plain; charset=utf-8' };

function safePath(urlPath) {
  const pathname = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (pathname === '/manus-routes.json') return path.join(root, 'public', 'manus-routes.json');
  const clean = pathname === '/' ? '/index.html' : pathname;
  const candidate = path.resolve(root, `.${clean}`);
  return candidate.startsWith(root) ? candidate : null;
}

async function sendFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'public, max-age=300' });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found' })); }
    else { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Server error' })); }
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS' && req.url?.startsWith('/api/claude')) { const result = await proxyClaude({ prompt: 'preflight' }, origin); res.writeHead(204, result.headers); res.end(); return; }
  if (req.url === '/api/health') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ ok: true, service: 'clearpath', aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY), sheetsConfigured: Boolean(process.env.SHEETS_WEB_APP_URL) })); return; }
  if (req.url?.startsWith('/api/claude')) {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Method not allowed.' })); return; }
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 8000) break; }
    const result = await proxyClaude(body, origin); res.writeHead(result.status, result.headers); res.end(JSON.stringify(result.body)); return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Method not allowed.' })); return; }
  const filePath = safePath(req.url);
  if (!filePath) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Bad path' })); return; }
  await sendFile(res, filePath);
});

server.listen(port, '0.0.0.0', () => console.log(`ClearPath listening on 0.0.0.0:${port}`));
