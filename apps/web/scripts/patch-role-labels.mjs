import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/i18n');
const rw = JSON.parse(fs.readFileSync(path.join(dir, 'rw.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

rw.auth.roleChw = "Umujyanama w'ubuzima";
rw.auth.roleNurse = 'Umuforomo';
rw.auth.roleSupervisor = 'Umuyobozi';
rw.auth.roleRbc = 'Umukozi wa RBC';
rw.auth.roleChwShort = 'CHW';
rw.auth.roleRbcShort = 'RBC';

en.auth.roleChwShort = en.auth.roleChwShort || 'CHW';
en.auth.roleRbcShort = en.auth.roleRbcShort || 'RBC';

fs.writeFileSync(path.join(dir, 'rw.json'), `${JSON.stringify(rw, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify(en, null, 2)}\n`);
console.log('role labels patched');
