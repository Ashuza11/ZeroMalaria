/**
 * Export phrase catalog to JSON for audio pack tooling.
 * Usage: node scripts/export_phrases_json.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const phrasesTs = fs.readFileSync(path.join(__dirname, '../src/voice/phrases.ts'), 'utf8');

const block = phrasesTs.match(/export const PHRASES = \{([\s\S]*?)\} as const/)?.[1] ?? '';
const entries = [...block.matchAll(/\b(\w+):\s*p\(\s*'([^']+)'/g)].map((m) => ({
  key: m[1],
  id: m[2],
}));

const outDir = path.join(__dirname, '../public/audio');
fs.mkdirSync(path.join(outDir, 'en'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'rw'), { recursive: true });

for (const lang of ['en', 'rw']) {
  const manifest = {
    language: lang,
    generated_at: new Date().toISOString(),
    phrases: entries.map((e) => ({ id: e.id, file: `${e.id}.mp3`, reviewed: false })),
  };
  fs.writeFileSync(path.join(outDir, lang, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

fs.writeFileSync(path.join(outDir, 'en', '.gitkeep'), '');
fs.writeFileSync(path.join(outDir, 'rw', '.gitkeep'), '');

console.log(`Wrote manifests for ${entries.length} phrases (en + rw).`);
