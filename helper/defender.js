// Windows Defender'ın komut satırı aracıyla (MpCmdRun) klasör taraması. Dosyalar bilgisayardan çıkmaz;
// tehdit bulunursa Defender her zamanki gibi kendi ayarına göre karantinaya alır.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const SCAN_TIMEOUT_MS = 5 * 60 * 1000;

function findMpCmdRun() {
  const candidates = [
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows Defender', 'Platform', 'CurrentVersion', 'MpCmdRun.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Windows Defender', 'MpCmdRun.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// Aynı anda tek tarama: toplu tarama ile WE'deki kutunun istekleri birbirini beklesin.
let queue = Promise.resolve();

// Sonuç: clean | threat | unavailable | error
function scanPath(target) {
  const run = () =>
    new Promise((resolve) => {
      const exe = findMpCmdRun();
      if (!exe) {
        resolve('unavailable');
        return;
      }
      // Çıkış kodu 2 hem "tehdit bulundu" hem de "tarama başarısız" (ör. 0x80508023: yol bulunamadı)
      // anlamına gelebiliyor; bu yüzden karar MpCmdRun'ın çıktı metnine göre verilir.
      execFile(exe, ['-Scan', '-ScanType', '3', '-File', target], { windowsHide: true, timeout: SCAN_TIMEOUT_MS }, (err, stdout) => {
        const out = stdout || '';
        if (/found \d+ threats?|LIST OF DETECTED THREATS/i.test(out)) resolve('threat');
        else if (/found no threats/i.test(out)) resolve('clean');
        // Defender kapalıysa (örneğin başka bir antivirüs kuruluysa) hizmet hatası döner.
        else if (/0x800106ba/i.test(out)) resolve('unavailable');
        else {
          console.error(`Defender taraması başarısız (kod ${err ? err.code : 0}):`, out.trim().slice(-300));
          resolve('error');
        }
      });
    });
  queue = queue.then(run, run);
  return queue;
}

module.exports = { scanPath };
