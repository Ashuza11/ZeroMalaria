import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

const routes = ['/', '/home', '/triage', '/referrals', '/alerts', '/facility', '/rbc'];
const base = process.env.ZM_BASE || 'http://127.0.0.1:4173';

async function shoot(name, width, height) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const route of routes) {
    const slug = route === '/' ? 'language' : route.slice(1);
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(800);
    const file = join(outDir, `${slug}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Wrote', file);
  }
  await browser.close();
}

await shoot('mobile', 390, 844);
await shoot('desktop', 1440, 900);
console.log('Done');
