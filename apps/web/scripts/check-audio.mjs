/**
 * Reports missing MP3 files for the rw (and optionally en) audio pack.
 * Exit 0 always (informational) unless --strict is passed.
 * Usage: node scripts/check-audio.mjs [--strict] [--lang=rw]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');
const langArg = process.argv.find((a) => a.startsWith('--lang='));
const lang = langArg ? langArg.split('=')[1] : 'rw';

const manifestPath = path.join(root, `public/audio/${lang}/manifest.json`);
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(strict ? 1 : 0);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const missing = [];
const present = [];
for (const p of manifest.phrases || []) {
  const file = path.join(root, `public/audio/${lang}`, p.file || `${p.id}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) present.push(p.id);
  else missing.push(p.id);
}
console.log(`[audio/${lang}] present=${present.length} missing=${missing.length}`);
if (missing.length) {
  console.log('Missing files:');
  for (const id of missing) console.log(`  - ${id}.mp3`);
}
if (strict && missing.length) process.exit(1);
