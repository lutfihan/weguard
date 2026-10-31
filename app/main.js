// WE Guard arka plan uygulaması: WE'nin içindeki kutuya veri veren yardımcıyı çalıştırır, ilk açılışta yüklü
// wallpaper'ları tarar, yeni inenleri izler ve WE güncellenip kutu silinirse onu kendiliğinden yeniden ekler.
//
// --uninstall-box: kaldırıcı (setup) çağırır; WE'yi yedekten eski haline döndürür ve çıkar.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, Tray, Menu, Notification, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');

const core = require('../helper/core');
const scan = require('../helper/scan');
const settings = require('../helper/settings');
const { t } = require('../helper/i18n');
const patcher = require('../tools/patcher');

const REPATCH_MS = 60 * 1000;
const UPDATE_FIRST_CHECK_MS = 30 * 1000;
const UPDATE_CHECK_MS = 6 * 60 * 60 * 1000;
const UPDATE_RESTART_DELAY_MS = 5000;
const ICON = path.join(__dirname, 'icon.png');
const UPDATE_LOG = path.join(settings.DIR, 'update.log');
// package.json'daki build.appId ile aynı (bildirimler bu kimlikle gösterilir).
// Windows açılışında başlatma kaydını kurulum yazar ve kaldırıcı siler: build/installer.nsh
const APP_ID = 'com.weguard.app';

const wePath = patcher.findWallpaperEngine();
let tray;
let patchErrorShown = false;

// Bildirimler: ayarlarda dil seçildiyse o, yoksa Windows'un dili.
const lang = () => core.effectiveLang(app.getLocale());

function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body, icon: ICON }).show();
}

function ensurePatched() {
  try {
    const s = patcher.status(wePath);
    if (!s.patched || !s.injectUpToDate) console.log(patcher.install(wePath));
  } catch (e) {
    console.error('Kutu eklenemedi:', e.message);
    if (!patchErrorShown) {
      patchErrorShown = true;
      notify('WE Guard', t(lang(), 'patch_failed', { message: e.message }));
    }
  }
}

function updateLog(message) {
  try {
    fs.mkdirSync(settings.DIR, { recursive: true });
    fs.appendFileSync(UPDATE_LOG, `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Kayıt yazılamazsa güncelleme yine de devam eder.
  }
}

// Yeni sürüm GitHub Releases'ten indirilir (SHA-512 özeti latest.yml ile doğrulanır), sessizce kurulur ve
// uygulama yeniden başlar. WE'deki kutu bu sırada yalnızca birkaç saniye "yardımcı çalışmıyor" der.
function startAutoUpdate() {
  const log = (m) => updateLog(typeof m === 'string' ? m : JSON.stringify(m));
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.on('update-downloaded', (info) => {
    notify('WE Guard', t(lang(), 'update_installing', { version: info.version }));
    setTimeout(() => autoUpdater.quitAndInstall(true, true), UPDATE_RESTART_DELAY_MS);
  });
  const check = () => autoUpdater.checkForUpdates().catch((e) => updateLog(`Güncelleme kontrolü başarısız: ${e.message}`));
  setTimeout(check, UPDATE_FIRST_CHECK_MS);
  setInterval(check, UPDATE_CHECK_MS);
}

function removeBoxAndQuit() {
  try {
    console.log(patcher.uninstall(wePath));
  } catch (e) {
    console.error('Kutu kaldırılamadı:', e.message);
  }
  app.quit();
}

// Kaldırma: WE'yi geri yükle. Geri yükleme başarılıysa yedek ve ayarlar da silinir.
function uninstallAndExit() {
  let restored = !wePath;
  try {
    if (wePath) {
      console.log(patcher.uninstall(wePath));
      restored = true;
    }
  } catch (e) {
    console.error('WE eski haline döndürülemedi:', e.message);
  }
  if (restored) fs.rmSync(settings.DIR, { recursive: true, force: true });
  app.exit(restored ? 0 : 1);
}

function startApp() {
  // Geliştirmede bildirimlerin görünmesi için; kurulu sürümde setup'ın verdiği kimlik kullanılır.
  app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath);
  if (app.isPackaged) startAutoUpdate();
  core.start().on('error', (e) => console.error('Yardımcı başlatılamadı:', e.message));

  tray = new Tray(nativeImage.createFromPath(ICON));
  tray.setToolTip(wePath ? 'WE Guard' : 'WE Guard: Wallpaper Engine bulunamadı');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'WE içindeki kutuyu kaldır ve çık', enabled: !!wePath, click: removeBoxAndQuit },
      { type: 'separator' },
      { label: 'Çıkış', click: () => app.quit() },
    ]),
  );

  if (!wePath) return;
  ensurePatched();
  setInterval(ensurePatched, REPATCH_MS);

  scan.onDone((summary) => notify(t(lang(), 'scan_done_title'), t(lang(), 'scan_done_body', summary)));
  scan.watchNew(lang, (report) => {
    if (!['warn', 'danger'].includes(report.state)) return;
    const reasons = report.reasons.slice(0, 2).map((r) => r.text);
    notify(t(lang(), 'new_item_title', report), [report.title ?? report.id, ...reasons].join('\n'));
  });
  if (!settings.get().firstScanDone) {
    scan
      .scanAll(lang())
      .then(() => settings.update({ firstScanDone: true }))
      .catch((e) => console.error('İlk tarama başarısız:', e.message));
  }
}

if (process.argv.includes('--uninstall-box')) {
  // Uygulama o sırada çalışıyor olsa bile (tek örnek kilidine takılmadan) geri yükleme yapılır.
  app.whenReady().then(uninstallAndExit);
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(startApp);
}
