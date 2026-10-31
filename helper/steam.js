// Steam'den anahtarsız alınan bilgiler: Atölye öğesi detayları, yorumlar ve yazar hesabının açılış tarihi.
'use strict';

const COMMENT_MAX = 500;
const AUTHOR_CACHE_MS = 24 * 60 * 60 * 1000;

async function details(id) {
  const res = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
    method: 'POST',
    body: new URLSearchParams({ itemcount: '1', 'publishedfileids[0]': id }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Steam detay HTTP ${res.status}`);
  return (await res.json()).response.publishedfiledetails[0];
}

// Bu uç nokta Steam tarafından belgelenmemiş; Atölye sayfası yorumları buradan yükler.
// Tek istekte en yeni COMMENT_MAX yorumu verir (sayfa sayfa çekmekten çok daha hızlı).
async function comments(creator, id) {
  const res = await fetch(`https://steamcommunity.com/comment/PublishedFile_Public/render/${creator}/${id}/`, {
    method: 'POST',
    body: new URLSearchParams({ start: '0', count: String(COMMENT_MAX) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Steam yorum HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error('Steam yorumları vermedi');
  const texts = [...json.comments_html.matchAll(/class="commentthread_comment_text"[^>]*>([\s\S]*?)<\/div>/g)]
    .map((m) => cleanText(m[1]));
  return { total: json.total_count, texts };
}

function cleanText(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const authorCache = new Map();

// Yazar hesabının açılış tarihi (ms). Profil gizliyse ya da alınamazsa null.
async function authorSince(steamid) {
  const hit = authorCache.get(steamid);
  if (hit && Date.now() - hit.at < AUTHOR_CACHE_MS) return hit.since;
  let since = null;
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamid}/?xml=1`, { signal: AbortSignal.timeout(8000) });
    const m = (await res.text()).match(/<memberSince>([^<]+)<\/memberSince>/);
    const parsed = m ? Date.parse(m[1]) : NaN;
    if (!Number.isNaN(parsed)) since = parsed;
  } catch {
    // Yazar bilgisi yalnızca ek bir sinyal; alınamazsa rapor onsuz devam eder.
  }
  authorCache.set(steamid, { at: Date.now(), since });
  return since;
}

module.exports = { details, comments, authorSince };
