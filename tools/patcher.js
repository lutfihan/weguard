// WE Guard kutusunu Wallpaper Engine arayüzüne ekler ya da kaldırır.
// Orijinal index.html, %LOCALAPPDATA%\WEGuard\backup\<WE sürümü>\ altına yedeklenir.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const INJECT_SRC = path.join(__dirname, '..', 'inject', 'weguard-inject.js');
const ANCHOR = '<script src="scripts/scripts.js"></script>';
const TAG = '<script src="scripts/weguard-inject.js"></script>';

function steamRoot() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) return path.normalize(m[1].trim());
  } catch {
    // Kayıt yoksa varsayılan Steam klasörü denenir.
  }
  return 'C:\\Program Files (x86)\\Steam';
}

// WE'nin kurulu olduğu klasörü bulur; Steam'in tüm kütüphane klasörlerine bakar.
function findWallpaperEngine() {
  if (process.env.WE_PATH) return process.env.WE_PATH;
  const root = steamRoot();
  const libraries = [root];
  try {
    const vdf = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libraries.push(m[1].replace(/\\\\/g, '\\'));
  } catch {
    // Kütüphane listesi okunamazsa yalnızca ana Steam klasörüne bakılır.
  }
  for (const lib of libraries) {
    const we = path.join(lib, 'steamapps', 'common', 'wallpaper_engine');
    if (fs.existsSync(path.join(we, 'version.json'))) return we;
  }
  return null;
}

function weInfo(we) {
  const dist = path.join(we, 'ui', 'dist');
  const version = JSON.parse(fs.readFileSync(path.join(we, 'version.json'), 'utf8')).version;
  const backupDir = path.join(process.env.LOCALAPPDATA, 'WEGuard', 'backup', version);
  return {
    we,
    version,
    index: path.join(dist, 'index.html'),
    injectDest: path.join(dist, 'scripts', 'weguard-inject.js'),
    backupDir,
    backup: path.join(backupDir, 'index.html'),
    // Atölye öğeleri WE ile aynı Steam kütüphanesine iner.
    workshopContent: path.join(we, '..', '..', 'workshop', 'content', '431960'),
  };
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Kurulu sürümde kaynak app.asar içinde; oku-yaz her durumda çalışır.
const copyInject = (dest) => fs.writeFileSync(dest, fs.readFileSync(INJECT_SRC));

function install(we) {
  const p = weInfo(we);
  const html = fs.readFileSync(p.index, 'utf8');
  if (html.includes(TAG)) {
    copyInject(p.injectDest);
    return 'Zaten ekliydi; kutu betiği güncellendi.';
  }
  if (html.split(ANCHOR).length !== 2) {
    throw new Error('index.html beklenen gibi değil (WE güncellenmiş olabilir). Hiçbir şey değiştirilmedi.');
  }
  fs.mkdirSync(p.backupDir, { recursive: true });
  if (!fs.existsSync(p.backup)) fs.copyFileSync(p.index, p.backup);
  // Önce betik, sonra etiket: index.html hiçbir an olmayan bir dosyaya işaret etmesin.
  copyInject(p.injectDest);
  fs.writeFileSync(p.index, html.replace(ANCHOR, `${ANCHOR} ${TAG}`));
  return `Eklendi (WE ${p.version}). Yedek: ${p.backup}`;
}

function uninstall(we) {
  const p = weInfo(we);
  const html = fs.readFileSync(p.index, 'utf8');
  if (html.includes(TAG)) {
    if (fs.existsSync(p.backup)) fs.copyFileSync(p.backup, p.index);
    else fs.writeFileSync(p.index, html.replace(` ${TAG}`, '').replace(TAG, ''));
  }
  fs.rmSync(p.injectDest, { force: true });
  return 'Kaldırıldı; WE orijinal haline döndü.';
}

function status(we) {
  const p = weInfo(we);
  const patched = fs.readFileSync(p.index, 'utf8').includes(TAG);
  const hasBackup = fs.existsSync(p.backup);
  return {
    version: p.version,
    patched,
    injectPresent: fs.existsSync(p.injectDest),
    backup: hasBackup ? p.backup : null,
    matchesBackup: !patched && hasBackup ? sha256(p.index) === sha256(p.backup) : null,
  };
}

module.exports = { findWallpaperEngine, weInfo, install, uninstall, status };
