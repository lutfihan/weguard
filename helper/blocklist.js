// Ortak kara liste: bilinen zararlı wallpaper'lar ve yazarlar. Projenin GitHub deposundan düzenli olarak
// indirilir; indirilemezse son indirilen kopya, o da yoksa uygulamayla gelen liste kullanılır.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const settings = require('./settings');

const URL = 'https://raw.githubusercontent.com/lutfihan/weguard/main/blocklist/blocklist.json';
const BUNDLED = path.join(__dirname, '..', 'blocklist', 'blocklist.json');
const CACHE = path.join(settings.DIR, 'blocklist.json');
const REFRESH_MS = 6 * 60 * 60 * 1000;

let list = { items: new Map(), authors: new Map(), updated: null, source: 'none', fetchedAt: null };

// Liste dışarıdan geldiği için yalnızca beklenen biçimdeki girdiler alınır.
function parse(text) {
  const data = JSON.parse(text);
  const items = new Map();
  const authors = new Map();
  for (const e of Array.isArray(data.items) ? data.items : []) {
    if (/^\d{1,20}$/.test(String(e?.id))) items.set(String(e.id), String(e.reason ?? '').slice(0, 200));
  }
  for (const e of Array.isArray(data.authors) ? data.authors : []) {
    if (/^\d{17}$/.test(String(e?.steamid))) authors.set(String(e.steamid), String(e.reason ?? '').slice(0, 200));
  }
  return { items, authors, updated: typeof data.updated === 'string' ? data.updated.slice(0, 40) : null };
}

function loadLocal() {
  for (const [file, source] of [[CACHE, 'cache'], [BUNDLED, 'bundled']]) {
    try {
      list = { ...parse(fs.readFileSync(file, 'utf8')), source, fetchedAt: fs.statSync(file).mtimeMs };
      return;
    } catch {
      // Sıradaki kaynağa geç.
    }
  }
}

async function refresh() {
  const res = await fetch(URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Kara liste HTTP ${res.status}`);
  const text = await res.text();
  const parsed = parse(text);
  fs.mkdirSync(settings.DIR, { recursive: true });
  fs.writeFileSync(CACHE, text);
  list = { ...parsed, source: 'remote', fetchedAt: Date.now() };
  return info();
}

function start() {
  loadLocal();
  const update = () => refresh().catch((e) => console.error('Kara liste güncellenemedi:', e.message));
  update();
  setInterval(update, REFRESH_MS);
}

const itemReason = (id) => list.items.get(String(id));
const authorReason = (steamid) => list.authors.get(String(steamid));

function info() {
  return {
    items: list.items.size,
    authors: list.authors.size,
    updated: list.updated,
    source: list.source,
    fetchedAt: list.fetchedAt,
  };
}

module.exports = { start, refresh, itemReason, authorReason, info };
