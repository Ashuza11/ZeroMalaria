/**
 * One-shot / CI helper: strip TODO_REVIEW_RW from rw.json into needs_review.rw.json
 * Prefer `npm run i18n:check` for validation after cleanup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(__dirname, '../src/i18n');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const rwPath = path.join(i18nDir, 'rw.json');
const enPath = path.join(i18nDir, 'en.json');
const rw = JSON.parse(fs.readFileSync(rwPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const flatRw = flatten(rw);
const flatEn = flatten(en);
const needs = [];

for (const [key, value] of Object.entries(flatRw)) {
  if (typeof value !== 'string') continue;
  if (value.includes('TODO_REVIEW_RW')) {
    needs.push(key);
    let clean = value.replace(/TODO_REVIEW_RW[:\s]*/gi, '').trim();
    if (!clean && flatEn[key]) clean = flatEn[key];
    setPath(rw, key, clean);
  }
}

fs.writeFileSync(rwPath, `${JSON.stringify(rw, null, 2)}\n`);
fs.writeFileSync(path.join(i18nDir, 'needs_review.rw.json'), `${JSON.stringify(needs.sort(), null, 2)}\n`);
console.log(`Cleaned ${needs.length} keys → needs_review.rw.json`);
