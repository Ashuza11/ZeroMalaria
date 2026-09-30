/**
 * Split i18n/{en,rw}.json into locales/{lang}/*.json (one file per top-level key).
 * rw is source of truth going forward; en is kept in parallel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../src');
const i18nDir = path.join(root, 'i18n');

const NS_GROUPS = {
  common: ['common', 'nav', 'login', 'lang', 'about', 'format', 'validation', 'presenter', 'status', 'liveDemo', 'prevention'],
  triage: ['home', 'triage', 'result', 'handover'],
  referrals: ['referrals', 'facility', 'messages', 'patients', 'users'],
  dashboard: ['rbc', 'supplies'],
  voice: ['voice', 'voiceSettings', 'voiceReview'],
  alerts: ['alerts', 'events'],
  roles: ['auth'],
  errors: [],
  time: ['time'],
};

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

for (const lang of ['rw', 'en']) {
  const src = JSON.parse(fs.readFileSync(path.join(i18nDir, `${lang}.json`), 'utf8'));
  const outDir = path.join(root, 'locales', lang);
  fs.mkdirSync(outDir, { recursive: true });

  for (const [top, value] of Object.entries(src)) {
    fs.writeFileSync(path.join(outDir, `${top}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }

  fs.writeFileSync(
    path.join(outDir, '_namespaces.json'),
    `${JSON.stringify(
      {
        groups: NS_GROUPS,
        note: 'Top-level *.json files are loaded and merged into the translation namespace; groups document the Phase-1 layout.',
      },
      null,
      2,
    )}\n`,
  );
}

const needs = JSON.parse(fs.readFileSync(path.join(i18nDir, 'needs_review.rw.json'), 'utf8'));
const rw = JSON.parse(fs.readFileSync(path.join(i18nDir, 'rw.json'), 'utf8'));
const flat = flatten(rw);
const review = {};
for (const key of Object.keys(flat).sort()) {
  review[key] = { status: needs.includes(key) ? 'draft' : 'reviewed' };
}
fs.writeFileSync(path.join(root, 'locales/rw/_review.json'), `${JSON.stringify(review, null, 2)}\n`);
console.log(`Split done. Keys: ${Object.keys(flat).length}, draft: ${needs.length}`);
