// WE Guard ayarları: %LOCALAPPDATA%\WEGuard\settings.json
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(process.env.LOCALAPPDATA, 'WEGuard');
const FILE = path.join(DIR, 'settings.json');

const DEFAULTS = {
  language: 'auto', // auto (WE'nin dili) | tr | en
  defender: true, // indirilen wallpaper'ları Windows Defender ile tara
  firstScanDone: false,
};

let current = null;

function get() {
  if (!current) {
    try {
      current = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
    } catch {
      current = { ...DEFAULTS };
    }
  }
  return current;
}

function update(patch) {
  current = { ...get(), ...patch };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(current, null, 2));
  return current;
}

module.exports = { DIR, get, update };
