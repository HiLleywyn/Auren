import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DOCUMENTS = [
  ['ARCHITECTURE', 'architecture', 'Architecture', 'The invention, complete internet path, precedents and global constraints.', 'System design'],
  ['ENGINEERING', 'engineering', 'Engineering budgets', 'Radio links, terrain, capacity, latency, weather and power.', 'System design'],
  ['MECHANISM', 'mechanism', 'Relay mechanism', 'Base assembly, locking collars, service carriage and unresolved loads.', 'Hardware'],
  ['SAFETY', 'safety', 'Controller & safety', 'Fail-closed simulation, physical boundaries and qualification.', 'Hardware'],
  ['ECONOMICS', 'economics', 'Five-year economics', 'Full cost accounting, quarter-cost hypothesis and sparse deployment limits.', 'Economics'],
  ['PLANNER', 'planner', 'Workbench methods', 'Adoption cohorts, cash flow, report schema and sampled terrain limitations.', 'Economics'],
  ['COMPARISON', 'comparison', 'Starlink & alternatives', 'Residential, mobility, maritime, aviation and geographic reach.', 'System design'],
  ['FIELD-TESTS', 'field-tests', 'Field experiments', 'Measurable pass/fail gates and the cheapest way to falsify the concept.', 'Validation'],
  ['BOM', 'bom', 'Prototype bill of materials', 'Catalog prices, unquoted allowances, missing approvals and paid labor.', 'Hardware'],
  ['ROADMAP', 'roadmap', 'Development plan', '30 days, 90 days, one year and a separate global track.', 'Validation'],
  ['COMMERCIAL', 'commercial', 'Pilot programme', 'Qualification, written scopes and commercial boundaries.', 'Operations'],
  ['SOURCES', 'sources', 'Primary sources', 'Vendor and research references with dates and claim boundaries.', 'Validation'],
  ['OPERATIONS', 'operations', 'Build & operations', 'Local hosting, containers, domain routing, mail and recovery.', 'Operations']
];
export const escapeHtml = text => String(text).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
export function safeLink(href) {
  const doc = DOCUMENTS.find(x => href.split('#')[0] === `${x[0]}.md`);
  if (doc) return `./${doc[1]}.html${href.includes('#') ? `#${slug(href.split('#')[1])}` : ''}`;
  if (href === 'RIGHTS.md' || href === '../RIGHTS.md') return './rights.html';
  if (/^https:\/\/[^\s<>"']+$/.test(href)) return href;
  if (/^#[a-zA-Z0-9-]+$/.test(href)) return href;
  return null;
}
export function inlineMarkdown(text) {
  const tokens = [];
  const token = html => { tokens.push(html); return `\u0001${tokens.length - 1}\u0002`; };
  let encoded = String(text).replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));
  encoded = encoded.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safe = safeLink(href);
    return token(safe ? `<a href="${escapeHtml(safe)}">${escapeHtml(label)}</a>` : escapeHtml(label));
  });
  encoded = escapeHtml(encoded).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return encoded.replace(/\u0001(\d+)\u0002/g, (_, i) => tokens[Number(i)]);
}
export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n'), output = [], headings = [], used = new Map();
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const type = line.slice(3).trim(); const content = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) content.push(lines[i++]);
      i++; output.push(`${type === 'mermaid' ? '<p class="code-caption">Network diagram source. The visual overview is on the home page; this text records its dependencies.</p>' : ''}<pre><code>${escapeHtml(content.join('\n'))}</code></pre>`); continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const base = slug(h[2]), count = (used.get(base) ?? 0) + 1; used.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base, level = h[1].length;
      if (level === 2 || level === 3) headings.push({ id, title: h[2], level });
      output.push(`<h${level} id="${id}">${inlineMarkdown(h[2])}</h${level}>`); i++; continue;
    }
    if (line.startsWith('|') && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      const headers = cells(line), rows = []; i += 2;
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      output.push(`<div class="table-scroll"><table><thead><tr>${headers.map(x => `<th scope="col">${inlineMarkdown(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    const list = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (list) {
      const ordered = /\d/.test(list[1]), items = [];
      while (i < lines.length) {
        const item = lines[i].match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!item) break; items.push(item[1]); i++;
      }
      output.push(`<${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${inlineMarkdown(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(?:#|```|\||[-*]\s|\d+\.\s)/.test(lines[i])) paragraph.push(lines[i++]);
    output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
  }
  return { html: output.join('\n'), headings };
}
function shell(title, content, extra = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(title)} — Auren engineering design library"><title>${escapeHtml(title)} — Auren</title><link rel="icon" href="../mark.svg" type="image/svg+xml"><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../docs.css">${extra}</head><body class="docs-page"><a class="skip" href="#main">Skip to content</a><header class="nav wrap"><a class="brand" href="../index.html"><img src="../mark.svg" width="34" height="34" alt=""><span>Auren<span class="brand-sub">Broadband research</span></span></a><nav aria-label="Main navigation"><a href="../index.html">Overview</a><a href="../workbench.html">Workbench</a><a href="./index.html" aria-current="page">Design library</a><a class="nav-contact" href="../partners.html">Pilot programme</a></nav></header>${content}<footer class="wrap"><p><strong>Auren</strong> · Design library · © 2026 Lleywyn · Source-visible, commercial rights retained.</p><p><a href="./rights.html">Rights</a> · <a href="./safety.html">Safety</a> · <a href="./sources.html">Primary sources</a> · <a href="https://github.com/HiLleywyn/Auren">GitHub</a></p><p>Experimental design, calculated estimates, and explicit hypotheses. No fabricated mast, field-qualified service, patent protection, or proven quarter-cost advantage is claimed.</p></footer></body></html>`;
}
export async function buildDocs(root, dist) {
  const directory = resolve(dist, 'docs'), downloads = resolve(directory, 'downloads'); await mkdir(downloads, { recursive: true });
  for (const [name, id, title, description, category] of DOCUMENTS) {
    const source = await readFile(resolve(root, 'docs', `${name}.md`), 'utf8'), rendered = renderMarkdown(source);
    await writeFile(resolve(downloads, `${name}.md`), source);
    const toc = rendered.headings.map(h => `<a class="toc-level-${h.level}" href="#${h.id}">${escapeHtml(h.title)}</a>`).join('');
    const body = `<main id="main" class="wrap doc-layout"><aside class="doc-sidebar"><a class="back-link" href="./index.html">← All documents</a><p class="micro-label">${escapeHtml(category)}</p><nav aria-label="Document sections">${toc}</nav><div class="doc-downloads"><a href="./downloads/${name}.md" download>Download Markdown ↧</a><a href="https://github.com/HiLleywyn/Auren/blob/main/docs/${name}.md">View source on GitHub ↗</a></div></aside><article class="doc-article"><p class="eyebrow">Auren / Design documentation</p>${rendered.html}<div class="doc-end"><a href="../workbench.html">Test assumptions in the workbench ↗</a><a href="./index.html">Back to design library ↗</a></div></article></main>`;
    await writeFile(resolve(directory, `${id}.html`), shell(title, body));
  }
  const rights = renderMarkdown(await readFile(resolve(root, 'RIGHTS.md'), 'utf8'));
  await writeFile(resolve(directory, 'rights.html'), shell('Rights', `<main id="main" class="wrap"><article class="doc-article rights-article">${rights.html}</article></main>`));
  const cards = DOCUMENTS.map(([name, id, title, description, category], index) => `<a class="document-card" href="./${id}.html" data-document data-category="${escapeHtml(category)}"><span class="micro-label">${String(index + 1).padStart(2, '0')} / ${escapeHtml(category)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><span class="card-link">Read document ↗</span></a>`).join('');
  const index = `<main id="main" class="wrap"><section class="library-heading"><div><p class="eyebrow">Design library / v0.2</p><h1>The engineering,<br>in the open.</h1><p class="lede">From mechanism to money. Every dependency has a place here.</p></div><p>These documents describe an experimental design—not certified hardware or a live ISP. Source files are downloadable, the models are reproducible, and the field-test gates are public.</p></section><div class="library-filter"><label for="document-search">Find a document<input id="document-search" type="search" placeholder="Radio, costs, safety…"></label><label for="document-category">Category<select id="document-category"><option value="all">All documents</option>${[...new Set(DOCUMENTS.map(x => x[4]))].map(c => `<option>${escapeHtml(c)}</option>`).join('')}</select></label><span id="document-count" role="status">${DOCUMENTS.length} documents</span></div><div class="document-grid">${cards}</div><p id="document-empty" class="help" hidden>No matching documents. Try a different term or category.</p><section class="library-assets"><div><h2>Prototype assets</h2><p>The geometry is conceptual, not a qualified structure. Field templates contain no fabricated measurements.</p></div><div><a href="./downloads/concept.scad" download>Concept CAD / OpenSCAD ↧</a><a href="./downloads/field-observations-template.csv" download>Field observation template / CSV ↧</a><a href="./downloads/terrain-template.csv" download>Sampled terrain template / CSV ↧</a></div></section></main>`;
  await writeFile(resolve(directory, 'index.html'), shell('Design library', index, '<script type="module" src="../library.mjs"></script>'));
  await cp(resolve(root, 'hardware/concept.scad'), resolve(downloads, 'concept.scad'));
  await cp(resolve(root, 'data/field-observations-template.csv'), resolve(downloads, 'field-observations-template.csv'));
  await writeFile(resolve(downloads, 'terrain-template.csv'), 'distance_m,obstruction_m\n');
  return DOCUMENTS.length;
}
