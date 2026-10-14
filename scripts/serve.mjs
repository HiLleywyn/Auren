import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../', import.meta.url)), 'dist');
const port = Number(process.env.PORT ?? 5190);
const host = process.env.HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
export function safePath(pathname) {
  let decoded; try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const path = resolve(root, `.${decoded === '/' ? '/index.html' : decoded}`);
  const rel = relative(root, path);
  return rel.startsWith(`..${sep}`) || rel === '..' || !rel || rel.split(sep).some(x => x.startsWith('.')) || path.endsWith('_headers') ? null : path;
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(req.method === 'HEAD' ? '' : '{"status":"ok","product":"Auren","mode":"SIMULATION_ONLY"}'); return; }
    const path = safePath(pathname);
    if (!path || !(await stat(path)).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.requestTimeout = 10000; server.headersTimeout = 10000;
server.listen(port, host, () => console.log(`Auren preview: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
