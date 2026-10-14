import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const checked = [];
for (const dir of ['src', 'scripts', 'test', 'site']) {
  for (const item of await readdir(resolve(root, dir))) if (item.endsWith('.mjs')) {
    const result = spawnSync(process.execPath, ['--check', resolve(root, dir, item)], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `Syntax error: ${item}`);
    checked.push(`${dir}/${item}`);
  }
}
const html = await readFile(resolve(root, 'site/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
if (ids.length !== new Set(ids).size) throw new Error('Duplicate HTML ids');
for (const match of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) if (!ids.includes(id)) throw new Error(`Unresolved accessible reference: ${id}`);
const script = await readFile(resolve(root, 'site/app.mjs'), 'utf8');
for (const match of script.matchAll(/\$\('([^']+)'\)|text\('([^']+)'/g)) if (!ids.includes(match[1] ?? match[2])) throw new Error(`Missing UI target: ${match[1] ?? match[2]}`);
if (/https?:\/\/(?:cdn|fonts)\./.test(html)) throw new Error('Unexpected external runtime dependency');
if (!html.includes('No broadband subscriptions or hardware deposits')) throw new Error('Missing commercial limitation');
console.log(`Checked ${checked.length} JS modules, ${ids.length} unique element ids, accessible references and disclosure.`);
