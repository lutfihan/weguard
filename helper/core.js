// WE Guard yardımcısı: WE'nin içine eklenen kutuya ve ayarlar sekmesine yerel HTTP üzerinden hizmet verir.
//   GET  /check?id=<atölye id>&lang=<WE dili>  -> risk raporu
//   GET  /settings?lang=<WE dili>              -> ayarlar, kara liste ve tarama durumu
//   POST /settings                              -> ayarları değiştir ({ language, defender })
//   POST /scan-all?lang=<WE dili>               -> yüklü tüm wallpaper'ları taramaya başla
//   POST /blocklist/refresh                     -> kara listeyi şimdi güncelle
'use strict';

const http = require('node:http');
const analyze = require('./analyze');
const blocklist = require('./blocklist');
const scan = require('./scan');
const settings = require('./settings');
const { normalizeLang } = require('./i18n');
const { version } = require('../package.json');

const PORT = 47321;
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
// WE'nin arayüzü bu adresten yükleniyor; tarayıcıdaki başka siteler yanıtları okuyamaz ve POST atamaz.
const ALLOWED_ORIGINS = new Set(['http://wpx.internal']);
const CHECK_WAIT_MS = 4000;
const MAX_BODY = 4096;

// Ayarlarda dil seçildiyse o, yoksa WE'nin dili.
function effectiveLang(weLang) {
  const chosen = settings.get().language;
  return chosen === 'tr' || chosen === 'en' ? chosen : normalizeLang(weLang);
}

function settingsView(lang) {
  const s = settings.get();
  return {
    lang,
    version,
    settings: { language: s.language, defender: s.defender },
    blocklist: blocklist.info(),
    scan: scan.status(),
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) reject(new Error('İstek çok büyük'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function applySettings(input) {
  const patch = {};
  if (['auto', 'tr', 'en'].includes(input.language)) patch.language = input.language;
  if (typeof input.defender === 'boolean') patch.defender = input.defender;
  settings.update(patch);
}

async function route(req, url) {
  const lang = () => effectiveLang(url.searchParams.get('lang'));

  if (req.method === 'GET' && url.pathname === '/check') {
    const id = url.searchParams.get('id') ?? '';
    if (!/^\d{1,20}$/.test(id)) return null;
    return analyze.check(id, { lang: lang(), waitMs: CHECK_WAIT_MS });
  }
  if (req.method === 'GET' && url.pathname === '/settings') return settingsView(lang());
  if (req.method === 'POST' && url.pathname === '/settings') {
    applySettings(await readJson(req));
    return settingsView(lang());
  }
  if (req.method === 'POST' && url.pathname === '/scan-all') {
    scan.scanAll(lang()).catch((e) => console.error('Toplu tarama başarısız:', e.message));
    return settingsView(lang());
  }
  if (req.method === 'POST' && url.pathname === '/blocklist/refresh') {
    try {
      await blocklist.refresh();
      return settingsView(lang());
    } catch (e) {
      return { ...settingsView(lang()), error: e.message };
    }
  }
  return null;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} origin=${origin ?? '-'}`);

    // Yalnızca bu bilgisayardan, doğrudan bu adrese gelen istekler (DNS rebinding'e karşı).
    if (!HOSTS.has(req.headers.host) || (origin && !ALLOWED_ORIGINS.has(origin))) {
      res.writeHead(403).end();
      return;
    }
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...cors,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Private-Network': 'true',
      }).end();
      return;
    }

    let result;
    try {
      result = await route(req, new URL(req.url, 'http://127.0.0.1'));
    } catch (e) {
      console.error(`${req.method} ${req.url}:`, e.message);
      res.writeHead(400, cors).end();
      return;
    }
    if (!result) {
      res.writeHead(404, cors).end();
      return;
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(result));
  });

  server.listen(PORT, '127.0.0.1', () => console.log(`WE Guard yardımcısı hazır: http://127.0.0.1:${PORT}`));
  return server;
}

function start() {
  blocklist.start();
  return startServer();
}

module.exports = { PORT, start, effectiveLang };
