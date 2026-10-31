// Yüklü tüm wallpaper'ları sırayla tarar (ilk kurulumda ve istenince), yeni inenleri izler ve
// son tarama özetini %LOCALAPPDATA%\WEGuard\scan-results.json içinde saklar.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const analyze = require('./analyze');
const settings = require('./settings');

const RESULTS = path.join(settings.DIR, 'scan-results.json');
const SETTLE_MS = 3000;

let running = null;
let progress = null;
let last = load();
const doneListeners = [];

function load() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
  } catch {
    return null;
  }
}

function installedIds() {
  const dir = analyze.workshopDir;
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /^\d+$/.test(name));
}

function scanAll(lang) {
  if (running) return running;
  running = (async () => {
    const ids = installedIds();
    progress = { done: 0, total: ids.length };
    const items = {};
    for (const id of ids) {
      const r = await analyze.check(id, { lang, waitMs: Infinity });
      items[id] = { state: r.state, title: r.title };
      progress.done++;
    }
    const counts = { ok: 0, warn: 0, danger: 0, unknown: 0 };
    for (const item of Object.values(items)) counts[item.state]++;
    last = { at: Date.now(), total: ids.length, ...counts, items };
    fs.mkdirSync(settings.DIR, { recursive: true });
    fs.writeFileSync(RESULTS, JSON.stringify(last, null, 2));
    for (const fn of doneListeners) fn(last);
    return last;
  })().finally(() => {
    running = null;
    progress = null;
  });
  return running;
}

// Steam yeni abone olunan wallpaper'ı indirme bitince bu klasöre taşır; inen her yeni öğe taranır.
function watchNew(getLang, onResult) {
  const dir = analyze.workshopDir;
  if (!dir || !fs.existsSync(dir)) return;
  const known = new Set(installedIds());
  fs.watch(dir, (_event, name) => {
    if (!name || !/^\d+$/.test(name) || known.has(name)) return;
    if (!fs.existsSync(path.join(dir, name))) return;
    known.add(name);
    setTimeout(() => {
      analyze
        .check(name, { lang: getLang(), waitMs: Infinity })
        .then(onResult)
        .catch((e) => console.error(`[${name}] yeni öğe taranamadı:`, e.message));
    }, SETTLE_MS);
  });
}

function status() {
  return {
    running: progress && { ...progress },
    last: last && { at: last.at, total: last.total, ok: last.ok, warn: last.warn, danger: last.danger, unknown: last.unknown },
  };
}

const onDone = (fn) => doneListeners.push(fn);

module.exports = { scanAll, watchNew, status, onDone };
