// WE Guard metinleri (Türkçe / İngilizce). Raporlar ve bildirimler buradan çevrilir.
'use strict';

function agoTr(days) {
  if (days < 1) return 'bugün';
  if (days < 31) return `${days} gün önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

function agoEn(days) {
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (days < 1) return 'today';
  if (days < 31) return plural(days, 'day');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}

const STRINGS = {
  tr: {
    not_found: "Steam'de bulunamadı ya da kaldırılmış",
    banned: (p) => `Valve tarafından yasaklanmış${p.reason ? `: ${p.reason}` : ''}`,
    application: 'Uygulama türü: bilgisayarında program çalıştırır',
    desc_password: 'Açıklamada şifre veriliyor (şifreli arşiv işareti)',
    desc_executable: 'Açıklamada çalıştırılabilir dosya adı geçiyor',
    desc_admin: 'Açıklama yönetici izni ya da antivirüsü kapatmayı istiyor',
    desc_download: 'Açıklamada Atölye dışı indirme linki var (wallpaper için gerekmez)',
    desc_invite: 'Açıklamada Discord/Telegram davet linki var',
    comments_flagged: (p) =>
      `${p.n} yorumda virüs ya da hesap çalma uyarısı var` +
      (p.themed ? ' (başlık da virüs temalı; yorumlar şaka olabilir)' : ''),
    comments_failed: 'Yorumlar alınamadı',
    web_type: 'Web türü: içinde JavaScript çalışır',
    blocklisted_item: (p) => `Kara listede: ${p.reason || 'bilinen zararlı wallpaper'}`,
    blocklisted_author: (p) => `Yazarı kara listede: ${p.reason || 'bilinen zararlı yazar'}`,
    new_and_risky: 'Yeni ya da az bilinen bir wallpaper; diğer bulgularla birlikte risk yüksek',
    steam_unreachable: "Steam'e ulaşılamadı",
    local_executable: (p) => `Klasörde program ya da script dosyası var: ${p.files}`,
    local_disguised: (p) => `${p.file} medya dosyası gibi görünüyor ama aslında program`,
    local_double_ext: (p) => `Çift uzantılı dosya: ${p.file}`,
    local_archive: (p) => `Arşiv dosyası var (wallpaper için gerekmez): ${p.files}`,
    local_encrypted_archive: (p) => `Şifreli arşiv: ${p.file}`,
    defender_threat: 'Windows Defender tehdit buldu',
    info_age: (p) => `${agoTr(p.days)} yüklendi · ${p.subs.toLocaleString('tr-TR')} abone`,
    info_author_new: (p) => `Yazar hesabı ${p.days} günlük`,
    info_comments: (p) =>
      `Yorumlar: ${p.total} toplam` +
      (p.scanned < p.total ? ` (son ${p.scanned} tanesi tarandı)` : '') +
      `, ${p.flagged ? `${p.flagged} tanesinde uyarı var` : 'uyarı yok'}`,
    info_files_pending: (p) => `${p.count} dosya kontrol edildi · Defender taraması sürüyor…`,
    info_files: (p) => `${p.count} dosya kontrol edildi · Defender: ${p.defender}`,
    defender_clean: 'temiz',
    defender_found: 'tehdit buldu',
    defender_off: 'kapalı',
    defender_unavailable: 'kullanılamıyor',
    defender_error: 'tarama hatası',
    scan_done_title: 'WE Guard taraması bitti',
    scan_done_body: (p) =>
      `${p.total} wallpaper tarandı: ${p.ok} güvenli, ${p.warn} şüpheli, ${p.danger} tehlikeli`,
    new_item_title: (p) => (p.state === 'danger' ? 'WE Guard: Tehlikeli olabilir' : 'WE Guard: Şüpheli wallpaper'),
    patch_failed: (p) => `Kutu Wallpaper Engine'e eklenemedi: ${p.message}`,
  },
  en: {
    not_found: 'Not found on Steam or removed',
    banned: (p) => `Banned by Valve${p.reason ? `: ${p.reason}` : ''}`,
    application: 'Application type: runs a program on your PC',
    desc_password: 'Description gives a password (sign of an encrypted archive)',
    desc_executable: 'Description mentions an executable file',
    desc_admin: 'Description asks for admin rights or disabling antivirus',
    desc_download: 'Description links to a download outside the Workshop (not needed for the wallpaper)',
    desc_invite: 'Description has a Discord/Telegram invite link',
    comments_flagged: (p) =>
      `${p.n} comment${p.n === 1 ? ' warns' : 's warn'} about viruses or stolen accounts` +
      (p.themed ? ' (the title is virus-themed too; comments may be jokes)' : ''),
    comments_failed: "Couldn't load comments",
    web_type: 'Web type: runs JavaScript',
    blocklisted_item: (p) => `On the blocklist: ${p.reason || 'known malicious wallpaper'}`,
    blocklisted_author: (p) => `Author is on the blocklist: ${p.reason || 'known malicious author'}`,
    new_and_risky: 'New or little-known wallpaper; together with the other findings the risk is high',
    steam_unreachable: "Couldn't reach Steam",
    local_executable: (p) => `Program or script files in the folder: ${p.files}`,
    local_disguised: (p) => `${p.file} looks like a media file but is actually a program`,
    local_double_ext: (p) => `Double-extension file: ${p.file}`,
    local_archive: (p) => `Archive file present (wallpapers don't need one): ${p.files}`,
    local_encrypted_archive: (p) => `Encrypted archive: ${p.file}`,
    defender_threat: 'Windows Defender found a threat',
    info_age: (p) => `Uploaded ${agoEn(p.days)} · ${p.subs.toLocaleString('en-US')} subscribers`,
    info_author_new: (p) => `Author account is ${p.days} days old`,
    info_comments: (p) =>
      `Comments: ${p.total} total` +
      (p.scanned < p.total ? ` (latest ${p.scanned} checked)` : '') +
      `, ${p.flagged ? `${p.flagged} with warnings` : 'no warnings'}`,
    info_files_pending: (p) => `${p.count} files checked · Defender scan in progress…`,
    info_files: (p) => `${p.count} files checked · Defender: ${p.defender}`,
    defender_clean: 'clean',
    defender_found: 'found a threat',
    defender_off: 'off',
    defender_unavailable: 'unavailable',
    defender_error: 'scan error',
    scan_done_title: 'WE Guard scan finished',
    scan_done_body: (p) =>
      `${p.total} wallpapers scanned: ${p.ok} safe, ${p.warn} suspicious, ${p.danger} dangerous`,
    new_item_title: (p) => (p.state === 'danger' ? 'WE Guard: May be dangerous' : 'WE Guard: Suspicious wallpaper'),
    patch_failed: (p) => `Couldn't add the box to Wallpaper Engine: ${p.message}`,
  },
};

const normalizeLang = (value) => (/^tr/i.test(String(value || '')) ? 'tr' : 'en');

function t(lang, key, params = {}) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return typeof s === 'function' ? s(params) : s;
}

module.exports = { t, normalizeLang };
