import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/i18n');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const rw = JSON.parse(fs.readFileSync(path.join(dir, 'rw.json'), 'utf8'));

en.time = {
  justNow: 'just now',
  minutesAgo: '{{count}} minutes ago',
  hoursAgo: '{{count}} hours ago',
  daysAgo: '{{count}} days ago',
};
rw.time = {
  justNow: 'ubu nonaha',
  minutesAgo: 'hashize iminota {{count}}',
  hoursAgo: 'hashize amasaha {{count}}',
  daysAgo: 'hashize iminsi {{count}}',
};

en.common.tagline = 'Community health';
rw.common.tagline = "Ubuzima bw'umuryango";
en.common.syntheticShort = 'Synthetic demo data';
rw.common.syntheticShort = "Amakuru y'ikigereranyo";

// Remove English "(synthetic)" from rw badge if present
rw.common.synthetic = "Amakuru y'ikigereranyo";

fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify(en, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'rw.json'), `${JSON.stringify(rw, null, 2)}\n`);
console.log('time + tagline i18n patched');
