// İndirilmiş bir wallpaper klasörünü kurallarla tarar: türüne uymayan program ve script dosyaları,
// medya gibi görünen programlar, çift uzantılar, arşivler ve şifreli arşivler.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXECUTABLE = new Set([
  '.exe', '.dll', '.scr', '.bat', '.cmd', '.com', '.pif', '.ps1', '.vbs', '.vbe', '.wsf', '.hta',
  '.jar', '.msi', '.lnk', '.reg', '.cpl', '.sys',
]);
const ARCHIVE = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.cab', '.iso']);
const DOUBLE_EXT = /\.(mp4|webm|mkv|avi|mov|gif|png|jpe?g|bmp|webp|mp3|wav|ogg|txt|pdf|docx?|html?)\.(exe|scr|bat|cmd|com|pif|vbs|js|ps1|lnk)$/i;
const MAX_FILES = 5000;
const NAMES_SHOWN = 3;

function walk(dir, out = [], base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (out.length >= MAX_FILES) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out, base);
    else if (entry.isFile()) {
      const st = fs.statSync(full);
      out.push({ full, rel: path.relative(base, full), size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return out;
}

function readHead(file, n) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(n);
    const read = fs.readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

// ZIP yerel dosya başlığında genel amaçlı bayrağın 0. biti şifreli girdiyi gösterir.
function isEncryptedZip(head) {
  return head.length >= 8 && head.readUInt32LE(0) === 0x04034b50 && (head.readUInt16LE(6) & 1) === 1;
}

function projectType(dir) {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')).type || '').toLowerCase() || null;
  } catch {
    return null;
  }
}

const listNames = (names) =>
  names.slice(0, NAMES_SHOWN).join(', ') + (names.length > NAMES_SHOWN ? ` +${names.length - NAMES_SHOWN}` : '');

// Sonuç: { type, count, signature, findings: [{ level, code, params }] }
// signature, klasör değişmediyse Defender taramasını tekrarlamamak için kullanılır.
function scanFolder(dir) {
  const files = walk(dir);
  const type = projectType(dir);
  const findings = [];
  const executables = [];
  const archives = [];

  if (type === 'application') findings.push({ level: 2, code: 'application' });

  for (const f of files) {
    const name = f.rel;
    const ext = path.extname(name).toLowerCase();
    if (DOUBLE_EXT.test(name)) {
      findings.push({ level: 2, code: 'local_double_ext', params: { file: name } });
    } else if (EXECUTABLE.has(ext)) {
      executables.push(name);
    } else if (ARCHIVE.has(ext)) {
      archives.push(name);
      if (ext === '.zip' && isEncryptedZip(readHead(f.full, 8))) {
        findings.push({ level: 2, code: 'local_encrypted_archive', params: { file: name } });
      }
    } else if (f.size >= 2 && readHead(f.full, 2).toString('latin1') === 'MZ') {
      findings.push({ level: 2, code: 'local_disguised', params: { file: name } });
    }
  }

  // Uygulama türü zaten program içerir; onu ayrıca "program var" diye saymayalım.
  if (executables.length && type !== 'application') {
    findings.push({ level: 2, code: 'local_executable', params: { files: listNames(executables) } });
  }
  if (archives.length) findings.push({ level: 1, code: 'local_archive', params: { files: listNames(archives) } });

  const signature = `${files.length}:${files.reduce((s, f) => s + f.size, 0)}:${Math.max(0, ...files.map((f) => f.mtimeMs))}`;
  return { type, count: files.length, signature, findings };
}

module.exports = { scanFolder };
