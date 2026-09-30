/** Apply Phase-1 glossary + new keys to locales (source of truth). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/locales');

function read(lang, name) {
  return JSON.parse(fs.readFileSync(path.join(root, lang, `${name}.json`), 'utf8'));
}
function write(lang, name, obj) {
  fs.writeFileSync(path.join(root, lang, `${name}.json`), `${JSON.stringify(obj, null, 2)}\n`);
}

const rwCommon = read('rw', 'common');
Object.assign(rwCommon, {
  synthetic: "Amakuru y'ikigereranyo (si aya nyayo)",
  syntheticShort: "Amakuru y'ikigereranyo",
  yes: 'Yego',
  no: 'Oya',
  unknown: 'Simbizi',
  repeat: 'Subiramo',
  offlineMock: 'Ikigereranyo nta interineti',
  stock: "Ububiko bw'imiti",
  close: 'Funga',
});
write('rw', 'common', rwCommon);

const enCommon = read('en', 'common');
Object.assign(enCommon, {
  synthetic: 'Synthetic demo data (not real)',
  syntheticShort: 'Synthetic demo data',
  yes: 'Yes',
  no: 'No',
  unknown: "I don't know",
  repeat: 'Repeat',
  offlineMock: 'Offline mock',
  stock: 'Medicine stock',
  close: 'Close',
});
write('en', 'common', enCommon);

const rwNav = read('rw', 'nav');
rwNav.notifications = 'Imenyesha';
write('rw', 'nav', rwNav);

const rwAuth = read('rw', 'auth');
rwAuth.roleSupervisor = 'Umugenzuzi';
write('rw', 'auth', rwAuth);

write('rw', 'time', {
  justNow: 'ubu nyine',
  minutesAgo: 'hashize iminota {{count}}',
  hoursAgo: 'hashize amasaha {{count}}',
  daysAgo: 'hashize iminsi {{count}}',
});

const rwHome = read('rw', 'home');
rwHome.newPatient = 'Tangira isuzuma';
write('rw', 'home', rwHome);

const rwTriage = read('rw', 'triage');
rwTriage.convulsions = 'Igicuri?';
write('rw', 'triage', rwTriage);

const rwVoice = read('rw', 'voice');
rwVoice.startGuidedTriage = 'Tangira isuzuma ryo mu majwi';
rwVoice.guidedTriage = 'Isuzuma ryo mu majwi';
write('rw', 'voice', rwVoice);

const rwMsg = read('rw', 'messages');
rwMsg.chipTransport = 'Tegura ubwikorezi';
rwMsg.chipMoreInfo = 'Dukeneye andi makuru';
write('rw', 'messages', rwMsg);

write('rw', 'supplies', {
  placeholderTitle: "Ububiko bw'imiti",
  placeholderBody: "Isesengura ry'ububiko riboneka ku kibaho cya RBC.",
});
write('en', 'supplies', {
  placeholderTitle: 'Medicine stock',
  placeholderBody: 'Stock pressure analytics appear on the RBC dashboard; detailed supply workflows are planned.',
});

const rbcExtra = {
  hotspotBanner: "Ubwiyongere bushobora kuba (ikimenyetso cya statistike)",
  under5: "Munsi y'imyaka 5",
  age5to14: '5–14',
  age15plus: '15+',
  funnelReferred: 'Byoherejwe',
  funnelReceived: 'Byakiriwe',
  funnelArrived: 'Yageze',
  funnelTreated: 'Yavuwe',
  baselineSeries: 'Iteganywa rya baseline',
  clearFilter: 'Siba akayunguruzo',
  compareTools: "Uko bihuye n'ibikoresho bisanzwe",
  compareToolsBody:
    "RapidSMS, ePOCT+, n'ibinyabiziga bya drone bifasha ibice — nta na kimwe gifunga inzira kuva ku mudugudu kugeza ku kigo. Inkomoko: RBC problem canvas, bisaba kwemezwa.",
  sourceCanvas: 'Inkomoko: RBC problem canvas, bisaba kwemezwa',
};
write('rw', 'rbc', { ...read('rw', 'rbc'), ...rbcExtra });

write('en', 'rbc', {
  ...read('en', 'rbc'),
  hotspotBanner: 'Potential increase detected (statistical signal)',
  under5: 'Under 5',
  age5to14: '5–14',
  age15plus: '15+',
  funnelReferred: 'Referred',
  funnelReceived: 'Received',
  funnelArrived: 'Arrived',
  funnelTreated: 'Treated',
  baselineSeries: 'Baseline forecast',
  clearFilter: 'Clear filter',
  compareTools: 'How this compares to existing tools',
  compareToolsBody:
    'RapidSMS, ePOCT+, and drone delivery each help parts of the pathway — none closes the village-to-clinic referral loop. Source: RBC problem canvas, to be verified.',
  sourceCanvas: 'Source: RBC problem canvas, to be verified',
});

write('rw', 'presenter', {
  translationReview: "Isuzuma ry'ubusobanuro",
  colKey: 'Urufunguzo',
  colEn: 'Icyongereza',
  colRw: 'Ikinyarwanda',
  colStatus: 'Imiterere',
  statusDraft: 'Icyitegerezo',
  statusReviewed: 'Byasuzumwe',
  draftOnly: 'Erekana gusa ibitegereje isuzuma',
  devOnlyHint: "Paji ya development. Imvugo zitegereje isuzuma n'umunyarwanda mbere yo gukoreshwa.",
  steps: 'Intambwe',
});
write('en', 'presenter', {
  translationReview: 'Translation review',
  colKey: 'Key',
  colEn: 'English',
  colRw: 'Kinyarwanda',
  colStatus: 'Status',
  statusDraft: 'Draft',
  statusReviewed: 'Reviewed',
  draftOnly: 'Show draft keys only',
  devOnlyHint: 'Dev-only page. Draft keys need native review before production.',
  steps: 'Steps',
});

const rwPrev = read('rw', 'prevention');
rwPrev.communityTitle = 'Kwirinda mu mudugudu';
write('rw', 'prevention', rwPrev);
const enPrev = read('en', 'prevention');
enPrev.communityTitle = 'Community prevention';
write('en', 'prevention', enPrev);

// Rebuild _review.json without wiping locale files
const needsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/i18n/needs_review.rw.json');
const needs = new Set(JSON.parse(fs.readFileSync(needsPath, 'utf8')));
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const rwDir = path.join(root, 'rw');
const merged = {};
for (const name of fs.readdirSync(rwDir)) {
  if (!name.endsWith('.json') || name.startsWith('_')) continue;
  merged[name.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(rwDir, name), 'utf8'));
}
const flat = flatten(merged);
const review = {};
for (const key of Object.keys(flat).sort()) {
  const isNew =
    key.startsWith('rbc.hotspot') ||
    key.startsWith('rbc.funnel') ||
    key.startsWith('rbc.compare') ||
    key.startsWith('rbc.source') ||
    key.startsWith('rbc.under') ||
    key.startsWith('rbc.age') ||
    key.startsWith('rbc.baseline') ||
    key.startsWith('rbc.clear') ||
    key.startsWith('presenter.') ||
    key.startsWith('common.yes') ||
    key.startsWith('common.no') ||
    key.startsWith('common.unknown') ||
    key.startsWith('common.repeat') ||
    key.startsWith('common.offline') ||
    key.startsWith('common.stock') ||
    key.startsWith('common.close') ||
    key === 'prevention.communityTitle';
  review[key] = { status: needs.has(key) || isNew ? 'draft' : 'reviewed' };
}
fs.writeFileSync(path.join(rwDir, '_review.json'), `${JSON.stringify(review, null, 2)}\n`);
console.log('Glossary applied. Keys:', Object.keys(flat).length);
