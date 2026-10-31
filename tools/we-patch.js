// WE Guard kutusunu Wallpaper Engine arayüzüne ekler ya da kaldırır.
// Kullanım: node we-patch.js install | uninstall | status
'use strict';

const patcher = require('./patcher');

const command = process.argv[2];
if (!['install', 'uninstall', 'status'].includes(command)) {
  console.error('Kullanım: node we-patch.js install | uninstall | status');
  process.exit(1);
}

try {
  const we = patcher.findWallpaperEngine();
  if (!we) throw new Error('Wallpaper Engine bulunamadı.');

  if (command !== 'status') {
    console.log(patcher[command](we));
  } else {
    const s = patcher.status(we);
    console.log(`WE klasörü: ${we}`);
    console.log(`WE sürümü: ${s.version}`);
    console.log(`Kutu ekli: ${s.patched ? 'evet' : 'hayır'}`);
    console.log(`Kutu betiği: ${s.injectPresent ? 'var' : 'yok'}`);
    console.log(`Yedek: ${s.backup ?? 'yok'}`);
    if (s.matchesBackup !== null) console.log(`index.html yedekle aynı: ${s.matchesBackup ? 'evet' : 'hayır'}`);
  }
} catch (e) {
  console.error(`Hata: ${e.message}`);
  process.exit(1);
}
