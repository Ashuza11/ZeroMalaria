/**
 * Merge locales/{lang}/*.json → i18n/{lang}.json (compatibility bundle).
 * Skips _*.json meta files. rw is source of truth; en must mirror keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../src');

for (const lang of ['rw', 'en']) {
  const dir = path.join(srcRoot, 'locales', lang);
  const merged = {};
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const top = name.replace(/\.json$/, '');
    merged[top] = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  }
  fs.writeFileSync(path.join(srcRoot, 'i18n', `${lang}.json`), `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Merged ${lang}: ${Object.keys(merged).length} namespaces`);
}
