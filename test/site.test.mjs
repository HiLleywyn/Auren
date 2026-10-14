import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, inlineMarkdown, safeLink, DOCUMENTS } from '../scripts/render-docs.mjs';
import { createStaticServer, safePath } from '../scripts/serve.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
let server, base;
before(async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  server = createStaticServer(); await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); } });

test('document renderer escapes raw markup and rejects active or unsafe links', () => {
  assert.ok(inlineMarkdown('<img src=x onerror=bad>').includes('&lt;img'));
  assert.equal(safeLink('javascript:alert(1)'), null); assert.equal(safeLink('//evil.test'), null);
  assert.equal(safeLink('https://official.example/path'), 'https://official.example/path');
  assert.equal(inlineMarkdown('[Click](javascript:alert)'), 'Click');
  assert.ok(renderMarkdown('```html\n<script>alert(1)</script>\n```').html.includes('&lt;script&gt;'));
});
test('headings get unique ids and known document references become local links', () => {
  const rendered = renderMarkdown('# Test\n\n## Repeat\n\n## Repeat');
  assert.deepEqual(rendered.headings.map(x => x.id), ['repeat', 'repeat-2']);
  assert.equal(safeLink('ENGINEERING.md'), './engineering.html');
});
test('all generated pages have valid local links, assets and unique accessible targets', async () => {
  const walk = async dir => {
    const paths = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) entry.isDirectory() ? paths.push(...await walk(resolve(dir, entry.name))) : paths.push(resolve(dir, entry.name));
    return paths;
  };
  const htmlPaths = (await walk(resolve(root, 'dist'))).filter(p => p.endsWith('.html'));
  assert.equal(htmlPaths.length, DOCUMENTS.length + 5);
  for (const path of htmlPaths) {
    const html = await readFile(path, 'utf8'), ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
    assert.equal(ids.length, new Set(ids).size, `Duplicate ids in ${path}`);
    for (const match of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), `${path} lacks ${id}`);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1]; if (/^(?:https:|mailto:|#)/.test(href)) continue;
      const destination = resolve(dirname(path), href.split('#')[0]);
      assert.ok((await stat(destination)).isFile(), `Missing link ${path}: ${href}`);
    }
  }
});
test('static server serves the full document library and downloadable assets with correct types', async () => {
  for (const [path, type] of [['/', 'text/html'], ['/workbench.html', 'text/html'], ['/partners.html', 'text/html'], ['/docs/planner.html', 'text/html'], ['/docs/downloads/PLANNER.md', 'text/plain'], ['/docs/downloads/terrain-template.csv', 'text/csv'], ['/src/planner.mjs', 'text/javascript']]) {
    const response = await fetch(base + path); assert.equal(response.status, 200, path); assert.ok(response.headers.get('content-type').startsWith(type));
  }
});
test('HTTP boundary does not expose credentials, hidden files, parent paths or write endpoints', async () => {
  for (const path of ['/../.credentials.json', '/.env', '/.git/config', '/.runtime/cf-account.mjs', '/.runtime/auren-dns-after.json', '/_headers', '/%5c..%5csecret', '/docs/%00', '/does-not-exist']) assert.equal((await fetch(base + path)).status, 404, path);
  assert.equal(safePath('/../../.credentials.json'), null);
  assert.equal((await fetch(base + '/', { method: 'POST', body: 'nothing' })).status, 405);
});

test('public enquiries use the branded address without exposing the forwarding destination', async () => {
  for (const path of ['/index.html', '/partners.html', '/partners.mjs', '/docs/commercial.html', '/docs/rights.html']) {
    const response = await fetch(base + path), body = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(body.includes('sales@auren.so'), path);
    assert.ok(!body.includes('support@dyadic.app'), path);
    assert.ok(!body.includes('@proton.me'), path);
  }
});
test('headers prohibit executable embeds and make HEAD and health checks usable', async () => {
  const response = await fetch(base + '/', { method: 'HEAD' });
  assert.equal(response.status, 200); assert.equal(await response.text(), '');
  assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
  assert.ok(response.headers.get('content-security-policy').includes("form-action 'none'"));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await (await fetch(base + '/healthz')).json()).mode, 'SIMULATION_ONLY');
});
