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
let totalIds = 0, pages = 0;
for (const filename of (await readdir(resolve(root, 'site'))).filter(x => x.endsWith('.html'))) {
  const html = await readFile(resolve(root, 'site', filename), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  if (ids.length !== new Set(ids).size) throw new Error(`Duplicate HTML ids in ${filename}`);
  for (const match of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) if (!ids.includes(id)) throw new Error(`Unresolved accessible reference: ${filename} ${id}`);
  const scripts = [...html.matchAll(/<script[^>]+src="\.\/([^\"]+)"/g)].map(x => x[1]);
  for (const source of scripts) {
    const script = await readFile(resolve(root, 'site', source), 'utf8');
    for (const match of script.matchAll(/\$\('([^']+)'\)|(?:text|put)\('([^']+)'/g)) if (!ids.includes(match[1] ?? match[2])) throw new Error(`Missing UI target: ${filename} ${match[1] ?? match[2]}`);
  }
  if (/https?:\/\/(?:cdn|fonts)\./.test(html)) throw new Error('Unexpected external runtime dependency');
  if (filename === 'index.html' && !html.includes('No broadband subscriptions or hardware deposits')) throw new Error('Missing commercial limitation');
  totalIds += ids.length; pages++;
}
console.log(`Checked ${checked.length} JS modules, ${pages} source pages, ${totalIds} element ids and accessible references.`);
