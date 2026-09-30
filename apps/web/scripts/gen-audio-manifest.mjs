/**
 * Lists every phrase / prompt id + Kinyarwanda text for native speakers to record.
 * Sources: src/voice/phrases.ts + src/locales/{rw,en} triage/common voice prompts.
 * Writes public/audio/rw/recording-checklist.json and refreshes manifest stubs.
 * Usage: node scripts/gen-audio-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const phrasesPath = path.join(root, 'src/voice/phrases.ts');
const outDir = path.join(root, 'public/audio/rw');
const enOutDir = path.join(root, 'public/audio/en');

const byId = new Map();

function upsert(id, en, rw, source) {
  const prev = byId.get(id);
  byId.set(id, {
    id,
    file: `${id}.mp3`,
    text_en: en || prev?.text_en || '',
    text_rw: rw || prev?.text_rw || '',
    source: prev ? `${prev.source},${source}` : source,
    reviewed: false,
  });
}

const src = fs.readFileSync(phrasesPath, 'utf8');
// Match: id: p(\n    'id',\n    'en',\n    'rw',\n
const re = /(\w+):\s*p\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'/g;
let m;
while ((m = re.exec(src))) {
  const id = m[2];
  const en = m[3].replace(/\\'/g, "'");
  const rw = m[4].replace(/\\'/g, "'");
  upsert(id, en, rw, 'phrases.ts');
}

// Locale prompt ids (yes/no and triage question labels) for recording checklist.
const rwTri = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/rw/triage.json'), 'utf8'));
const enTri = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en/triage.json'), 'utf8'));
const rwCommon = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/rw/common.json'), 'utf8'));
const enCommon = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en/common.json'), 'utf8'));
const localePromptKeys = [
  ['prompt_yes', 'yes', rwTri, enTri],
  ['prompt_no', 'no', rwTri, enTri],
  ['prompt_yes_common', 'yes', rwCommon, enCommon],
  ['prompt_no_common', 'no', rwCommon, enCommon],
];
for (const [id, key, rwObj, enObj] of localePromptKeys) {
  if (rwObj[key] || enObj[key]) upsert(id, enObj[key] || '', rwObj[key] || '', 'locales');
}
const triageQuestionKeys = [
  'age',
  'sex',
  'temperature',
  'feverDays',
  'convulsions',
  'unableToDrink',
  'vomitingEverything',
  'lethargy',
  'breathing',
  'tdr',
];
for (const key of triageQuestionKeys) {
  if (rwTri[key] || enTri[key]) {
    upsert(`locale_triage_${key}`, enTri[key] || '', rwTri[key] || '', 'locales/triage');
  }
}

const phrases = [...byId.values()];

phrases.sort((a, b) => a.id.localeCompare(b.id));
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(enOutDir, { recursive: true });

const checklist = {
  language: 'rw',
  generated_at: new Date().toISOString(),
  instructions:
    'Record each text_rw line as public/audio/rw/<id>.mp3 (mono, ~64kbps). Mark reviewed true after native review.',
  phrases,
};
fs.writeFileSync(path.join(outDir, 'recording-checklist.json'), JSON.stringify(checklist, null, 2));

const manifest = {
  language: 'rw',
  generated_at: new Date().toISOString(),
  phrases: phrases.map(({ id, file, reviewed }) => ({ id, file, reviewed })),
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(
  path.join(enOutDir, 'manifest.json'),
  JSON.stringify(
    {
      language: 'en',
      generated_at: new Date().toISOString(),
      phrases: phrases.map(({ id, file, reviewed }) => ({ id, file, reviewed })),
    },
    null,
    2,
  ),
);

console.log(`Wrote ${phrases.length} phrase entries to ${path.join(outDir, 'recording-checklist.json')}`);
