// Bir Atölye öğesi için risk raporu. Steam bilgileri (açıklama, yorumlar, yaş, abone, yazar), ortak kara
// liste ve wallpaper indirilmişse dosya taraması (kurallar + Windows Defender) birleştirilir.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const steam = require('./steam');
const blocklist = require('./blocklist');
const defender = require('./defender');
const localscan = require('./localscan');
const settings = require('./settings');
const { t } = require('./i18n');
const patcher = require('../tools/patcher');

const STEAM_CACHE_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Yaş ve tanınırlık tek başına uyarı sebebi değil; başka bir şüpheli bulguyla birleşince riski yükseltir.
const NEW_ITEM_DAYS = 30;
const FEW_SUBSCRIBERS = 100;
const NEW_AUTHOR_DAYS = 90;

// Yorumlarda aranan uyarı kelimeleri. Kampanya Çin ve Rusya ağırlıklı olduğu için o diller de var.
const WARN_COMMENT = new RegExp(
  [
    'virüs', 'virus', 'trojan', 'truva', 'zararlı', 'kötü amaçlı', 'solucan', 'hesab[ıi]m[ıi]? çal',
    'hacklen', 'karantina',
    '\\bmalware', '\\bbackdoor', '\\bstealer', '\\bminer\\b', '\\bmining\\b', 'keylog', '\\bhacked\\b',
    'stole my', 'account (was )?stolen', 'ransomware', '\\binfected\\b', '\\bdefender\\b', 'quarantin',
    'вирус', 'троян', 'майнер', 'стилер', 'взлом', 'украли', 'вредонос',
    '病毒', '木马', '挖矿', '盗号', '后门', '恶意',
  ].join('|'),
  'i',
);

// [kural, kod, seviye] - 1: şüpheli, 0: yalnızca bilgi (risk seviyesini yükseltmez).
const DESCRIPTION_RULES = [
  [/(password|şifre|parola|пароль|密码)\s*[:：=]/i, 'desc_password', 1],
  [/\.(exe|scr|bat|cmd|ps1|vbs|msi|dll)\b/i, 'desc_executable', 1],
  [/(run as admin|yönetici olarak çalıştır|disable (your )?antivirus|antivirüs(ü)? kapat)/i, 'desc_admin', 1],
  // Aşağıdakiler çok yaygın ve çoğunlukla masum (orijinal video linki, topluluk sunucusu).
  [/(bit\.ly|tinyurl|mega\.nz|mediafire|drive\.google|dropbox\.com)/i, 'desc_download', 0],
  [/(discord\.gg|discord\.com\/invite|t\.me\/)/i, 'desc_invite', 0],
];

const KINDS = { Scene: 'Scene', Video: 'Video', Web: 'Web', Application: 'Application' };
const DEFENDER_LABEL = {
  clean: 'defender_clean',
  threat: 'defender_found',
  off: 'defender_off',
  unavailable: 'defender_unavailable',
  error: 'defender_error',
};

const wePath = patcher.findWallpaperEngine();
const workshopDir = wePath ? patcher.weInfo(wePath).workshopContent : null;

async function steamPart(id) {
  const d = await steam.details(id);
  // Valve'ın kaldırdığı zararlı öğeler diskte kalmaya devam eder; ama yazarlar da kendi öğelerini silebilir.
  if (!d || d.result !== 1) return { missing: true, findings: [{ level: 1, code: 'not_found' }] };

  const findings = [];
  const tags = (d.tags || []).map((tag) => tag.tag);
  if (d.banned) findings.push({ level: 2, code: 'banned', params: { reason: d.ban_reason } });
  if (tags.includes('Application')) findings.push({ level: 2, code: 'application' });
  for (const [re, code, level] of DESCRIPTION_RULES) {
    if (re.test(d.description || '')) findings.push({ level, code });
  }

  let comments = null;
  try {
    const c = await steam.comments(d.creator, id);
    const flagged = c.texts.filter((text) => WARN_COMMENT.test(text));
    comments = {
      total: c.total,
      scanned: c.texts.length,
      flagged: flagged.length,
      samples: flagged.slice(0, 2).map((text) => text.slice(0, 140)),
    };
    if (flagged.length) {
      // "Ricardo Windows Virus" gibi virüs temalı wallpaper'larda yorumlar çoğunlukla temadan bahseder.
      const themed = WARN_COMMENT.test(d.title || '');
      findings.push({ level: flagged.length >= 3 && !themed ? 2 : 1, code: 'comments_flagged', params: { n: flagged.length, themed } });
    }
  } catch (e) {
    console.error(`[${id}] yorumlar alınamadı:`, e.message);
    findings.push({ level: 0, code: 'comments_failed' });
  }

  if (tags.includes('Web')) findings.push({ level: 0, code: 'web_type' });

  const authorSince = await steam.authorSince(d.creator);
  const kindTag = Object.keys(KINDS).find((k) => tags.includes(k));
  return {
    title: d.title,
    kind: kindTag || null,
    creator: d.creator,
    findings,
    comments,
    ageDays: Math.max(0, Math.floor((Date.now() - d.time_created * 1000) / DAY_MS)),
    subs: d.lifetime_subscriptions ?? d.subscriptions ?? 0,
    authorDays: authorSince ? Math.max(0, Math.floor((Date.now() - authorSince) / DAY_MS)) : null,
  };
}

const steamCache = new Map();

function cachedSteamPart(id) {
  const hit = steamCache.get(id);
  if (hit && Date.now() - hit.at < STEAM_CACHE_MS) return hit.promise;
  const promise = steamPart(id);
  steamCache.set(id, { at: Date.now(), promise });
  promise.catch(() => steamCache.delete(id));
  return promise;
}

// Klasör değişmedikçe Defender taraması tekrarlanmaz.
const localCache = new Map();

function localPart(id) {
  if (!workshopDir) return null;
  const dir = path.join(workshopDir, id);
  if (!fs.existsSync(dir)) return null;

  const scan = localscan.scanFolder(dir);
  const useDefender = settings.get().defender;
  let entry = localCache.get(id);
  if (!entry || entry.signature !== scan.signature || (useDefender && entry.defender === 'off')) {
    entry = { signature: scan.signature, defender: 'off', done: Promise.resolve() };
    if (useDefender) {
      entry.defender = 'pending';
      entry.done = defender.scanPath(dir).then((result) => {
        entry.defender = result;
      });
    }
    localCache.set(id, entry);
  }
  return { scan, entry, defender: useDefender ? entry.defender : 'off' };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// waitMs: Defender taraması için en fazla bu kadar beklenir (Infinity: bitene kadar).
// Bitmezse rapor pending: true döner; WE'deki kutu kısa süre sonra yeniden sorar.
async function check(id, { lang = 'tr', waitMs = 0 } = {}) {
  let s = null;
  try {
    s = await cachedSteamPart(id);
  } catch (e) {
    console.error(`[${id}]`, e.message);
  }
  let local = localPart(id);
  if (local && local.defender === 'pending' && waitMs > 0) {
    await (waitMs === Infinity ? local.entry.done : Promise.race([local.entry.done, sleep(waitMs)]));
    local = { ...local, defender: local.entry.defender };
  }
  return build(id, s, local, lang);
}

function build(id, s, local, lang) {
  const findings = s ? [...s.findings] : [{ level: 0, code: 'steam_unreachable' }];

  const itemReason = blocklist.itemReason(id);
  if (itemReason !== undefined) findings.push({ level: 2, code: 'blocklisted_item', params: { reason: itemReason } });
  const authorReason = s?.creator ? blocklist.authorReason(s.creator) : undefined;
  if (authorReason !== undefined) findings.push({ level: 2, code: 'blocklisted_author', params: { reason: authorReason } });

  if (local) {
    findings.push(...local.scan.findings);
    if (local.defender === 'threat') findings.push({ level: 2, code: 'defender_threat' });
  }

  // Aynı bulgu hem Steam'den hem dosyalardan gelebilir (ör. uygulama türü); bir kez gösterilir.
  const unique = [...new Map(findings.map((f) => [f.code, f])).values()];
  let level = Math.max(0, ...unique.map((f) => f.level));
  const newOrUnknown =
    s && !s.missing &&
    (s.ageDays < NEW_ITEM_DAYS || s.subs < FEW_SUBSCRIBERS || (s.authorDays !== null && s.authorDays < NEW_AUTHOR_DAYS));
  if (level === 1 && newOrUnknown) {
    level = 2;
    unique.push({ level: 2, code: 'new_and_risky' });
  }

  const info = [];
  if (s && !s.missing) {
    info.push(t(lang, 'info_age', { days: s.ageDays, subs: s.subs }));
    if (s.authorDays !== null && s.authorDays < 365) info.push(t(lang, 'info_author_new', { days: s.authorDays }));
    if (s.comments) info.push(t(lang, 'info_comments', s.comments));
  }
  if (local) {
    info.push(
      local.defender === 'pending'
        ? t(lang, 'info_files_pending', { count: local.scan.count })
        : t(lang, 'info_files', { count: local.scan.count, defender: t(lang, DEFENDER_LABEL[local.defender]) }),
    );
  }

  return {
    id,
    title: s?.title ?? null,
    kind: s?.kind ?? null,
    lang,
    state: !s && !local ? 'unknown' : ['ok', 'warn', 'danger'][level],
    pending: local?.defender === 'pending',
    installed: !!local,
    reasons: unique
      .sort((a, b) => b.level - a.level)
      .map((f) => ({ level: f.level, text: t(lang, f.code, f.params) })),
    info,
    samples: s?.comments?.samples ?? [],
  };
}

module.exports = { check, workshopDir };
