import fs from 'node:fs';

const files = [
  'src/pages/ReferralsPage.tsx',
  'src/pages/AlertsPage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/HandoverPage.tsx',
  'src/pages/PreventionPage.tsx',
  'src/pages/PatientsPage.tsx',
  'src/pages/FacilityPage.tsx',
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(
    /import \{ relativeTime \} from ['"]\.\.\/lib\/cn['"];?/g,
    "import { relativeTime } from '../lib/relativeTime';",
  );
  fs.writeFileSync(f, s);
  console.log('fixed', f);
}
