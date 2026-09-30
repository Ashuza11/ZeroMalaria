/**
 * Playwright screenshots for shell verification.
 * Requires: API on :8000, preview on :4173 (or ZM_BASE / ZM_API).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

const base = process.env.ZM_BASE || 'http://127.0.0.1:4173';
const api = process.env.ZM_API || 'http://127.0.0.1:8000';
const password = process.env.ZM_DEMO_PASSWORD || 'demo1234';

async function login(page, username) {
  const res = await page.request.post(`${api}/auth/login`, {
    data: { username, password },
  });
  if (!res.ok()) throw new Error(`login failed ${username}: ${res.status()}`);
  const data = await res.json();
  await page.addInitScript((session) => {
    sessionStorage.setItem('zm_session', JSON.stringify(session));
    localStorage.setItem('zm_lang', 'rw');
    localStorage.setItem('zm_preferred_view', 'auto');
  }, { access_token: data.access_token, user: data.user, offline_until: Date.now() + 86400000 });
}

async function shootDesktop() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
  for (const username of ['chw.demo', 'nurse.demo', 'supervisor.demo', 'rbc.demo']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, username);
    await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(800);
    const role = username.split('.')[0];
    const file = join(outDir, `shell-desktop-${role}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Wrote', file, page.url());
    await context.close();
  }
  await browser.close();
}

async function shootMobile() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await login(page, 'chw.demo');
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const file = join(outDir, 'shell-mobile-chw-home.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('Wrote', file, page.url());
  await browser.close();
}

await shootDesktop();
await shootMobile();
console.log('Done');
