import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shotDir = join(__dirname, '../../../docs/screenshots');
mkdirSync(shotDir, { recursive: true });

const API = process.env.ZM_API || 'http://127.0.0.1:8000';
const PASSWORD = process.env.ZM_DEMO_PASSWORD || 'demo1234';

const ROLES = [
  { role: 'CHW', username: 'clarencemutesi' },
  { role: 'HEALTH_CENTER', username: 'vanessaingabire' },
  { role: 'RBC_ADMIN', username: 'augustinshema' },
  { role: 'SUPER_ADMIN', username: 'super.admin' },
] as const;

async function loginViaApi(page: Page, username: string) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { username, password: PASSWORD },
  });
  expect(res.ok(), `login ${username}`).toBeTruthy();
  const data = await res.json();
  await page.addInitScript((session) => {
    sessionStorage.setItem('zm_session', JSON.stringify(session));
    localStorage.setItem('zm_lang', 'rw');
    localStorage.setItem('zm_preferred_view', 'auto');
  }, { access_token: data.access_token, user: data.user, offline_until: Date.now() + 86400000 });
}

test.describe('Desktop web shell @ 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { role, username } of ROLES) {
    test(`/${role} lands on /app/* with sidebar, no phone chrome`, async ({ page }) => {
      await loginViaApi(page, username);
      await page.goto('/');
      await page.waitForURL(/\/app\//, { timeout: 15000 });
      expect(page.url()).toMatch(/\/app\//);

      await expect(page.getByTestId('web-sidebar')).toBeVisible();
      await expect(page.getByTestId('mobile-tab-bar')).toHaveCount(0);
      await expect(page.locator('img[alt*="QR"], img[alt*="qr"]')).toHaveCount(0);
      await expect(page.getByTestId('open-web-banner')).toHaveCount(0);

      await page.screenshot({
        path: join(shotDir, `shell-desktop-${role}.png`),
        fullPage: true,
      });
    });
  }
});

test.describe('Mobile shell @ 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('CHW / lands on /m/home with tab bar', async ({ page }) => {
    await loginViaApi(page, 'clarencemutesi');
    await page.goto('/');
    await page.waitForURL(/\/m\/home/, { timeout: 15000 });
    await expect(page.getByTestId('mobile-tab-bar')).toBeVisible();
    await expect(page.getByTestId('web-sidebar')).toHaveCount(0);
    await page.screenshot({
      path: join(shotDir, 'shell-mobile-chw-home.png'),
      fullPage: true,
    });
  });
});
