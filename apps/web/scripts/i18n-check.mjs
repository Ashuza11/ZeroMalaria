/**
 * npm run i18n:check
 * (a) fail if any value in en.json/rw.json contains TODO_REVIEW_RW
 * (b) fail if key sets differ
 * (c) print count of keys in needs_review.rw.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../src/i18n');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const en = flatten(JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8')));
const rw = flatten(JSON.parse(fs.readFileSync(path.join(dir, 'rw.json'), 'utf8')));
const needsPath = path.join(dir, 'needs_review.rw.json');
const needs = fs.existsSync(needsPath) ? JSON.parse(fs.readFileSync(needsPath, 'utf8')) : [];

let failed = false;

for (const [file, flat] of [
  ['en.json', en],
  ['rw.json', rw],
]) {
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value === 'string' && value.includes('TODO_REVIEW_RW')) {
      console.error(`FAIL ${file}: ${key} contains TODO_REVIEW_RW`);
      failed = true;
    }
  }
}

const enKeys = new Set(Object.keys(en));
const rwKeys = new Set(Object.keys(rw));
for (const k of enKeys) {
  if (!rwKeys.has(k)) {
    console.error(`FAIL missing in rw.json: ${k}`);
    failed = true;
  }
}
for (const k of rwKeys) {
  if (!enKeys.has(k)) {
    console.error(`FAIL missing in en.json: ${k}`);
    failed = true;
  }
}

console.log(`Keys needing native review: ${needs.length}`);
if (failed) {
  process.exit(1);
}
console.log('i18n:check OK');
