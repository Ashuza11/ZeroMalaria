#!/usr/bin/env node
/** Repo-root entry: delegates to apps/web audio manifest generator. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'apps/web/scripts/gen-audio-manifest.mjs');
const r = spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: path.join(root, 'apps/web') });
process.exit(r.status ?? 1);
