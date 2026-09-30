import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shotDir = join(__dirname, '../../../docs/screenshots');
mkdirSync(shotDir, { recursive: true });

const API = process.env.ZM_API || 'http://127.0.0.1:8000';
const PASSWORD = process.env.ZM_DEMO_PASSWORD || 'demo1234';

async function loginViaApi(page: Page, username = 'super.admin') {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { username, password: PASSWORD },
  });
  expect(res.ok(), `login ${username}`).toBeTruthy();
  const data = await res.json();
  await page.addInitScript(
    (session) => {
      sessionStorage.setItem('zm_session', JSON.stringify(session));
      localStorage.setItem('zm_lang', 'rw');
      localStorage.setItem('zm_preferred_view', 'web');
      // Avoid stale PWA precache during local e2e.
      void navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
    },
    { access_token: data.access_token, user: data.user, offline_until: Date.now() + 86400000 },
  );
}

async function assertChromePinned(page: Page) {
  const sidebar = page.getByTestId('web-sidebar');
  const header = page.getByTestId('app-header');
  const main = page.getByTestId('app-main');
  await expect(sidebar).toBeVisible();
  const beforeSide = await sidebar.boundingBox();
  const beforeHead = await header.boundingBox();
  expect(beforeSide).toBeTruthy();
  expect(beforeHead).toBeTruthy();

  await main.evaluate((el) => {
    el.scrollTop = 1500;
  });
  await page.waitForTimeout(200);

  const afterSide = await sidebar.boundingBox();
  const afterHead = await header.boundingBox();
  expect(afterSide!.y).toBe(beforeSide!.y);
  expect(afterSide!.x).toBe(beforeSide!.x);
  expect(afterHead!.y).toBe(beforeHead!.y);
  const docScroll = await page.evaluate(() => document.scrollingElement?.scrollTop ?? -1);
  expect(docScroll).toBe(0);
}

test.describe('Shell scroll lock @ 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sidebar and header stay put; modal centered', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/app/users');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await assertChromePinned(page);

    const headerBox = await page.getByTestId('app-header').boundingBox();
    expect(headerBox).toBeTruthy();
    // one-row header: height under ~80px
    expect(headerBox!.height).toBeLessThan(88);

    await page.getByTestId('add-user').click();
    const panel = page.getByTestId('modal-panel');
    await expect(panel).toBeVisible();
    const overlay = page.getByTestId('modal-overlay');
    await expect(overlay).toBeVisible();
    const pb = await panel.boundingBox();
    const vw = page.viewportSize()!;
    expect(pb).toBeTruthy();
    const cx = pb!.x + pb!.width / 2;
    const cy = pb!.y + pb!.height / 2;
    expect(Math.abs(cx - vw.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(cy - vw.height / 2)).toBeLessThanOrEqual(24);

    const footerBtn = panel.locator('footer button').first();
    await expect(footerBtn).toBeVisible();

    await page.screenshot({ path: join(shotDir, 'users-list-scrolled.png') });
    await page.keyboard.press('Escape');
  });

  test('row actions visible for SUPER_ADMIN', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/app/users');
    await expect(page.getByTestId('data-table')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: join(shotDir, 'users-list.png') });
    const actions = page.locator('[data-testid="data-table"] tbody tr').first().locator('td').last();
    await expect(actions.getByLabel(/Reba|View/i).or(actions.locator('button').first())).toBeVisible();
  });
});

test.describe('Shell @ 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('chrome pinned', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/app/users');
    await assertChromePinned(page);
  });
});

test.describe('Shell @ 768 tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('off-canvas sidebar', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/app/users');
    await expect(page.getByTestId('web-sidebar-drawer')).toHaveCount(0);
    await page.getByTestId('app-header').locator('button').first().click();
    await expect(page.getByTestId('web-sidebar-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('web-sidebar-drawer')).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(overflow).toBe(false);
  });
});

test.describe('Shell @ 390 mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('mobile cards and sidebar', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/app/users');
    await page.getByTestId('app-header').locator('button').first().click();
    await expect(page.getByTestId('web-sidebar-drawer')).toBeVisible();
    await page.screenshot({ path: join(shotDir, 'mobile-sidebar-open.png') });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: join(shotDir, 'mobile-users-cards.png') });
    await page.getByTestId('add-user').click();
    await expect(page.getByTestId('modal-panel')).toBeVisible();
    await page.screenshot({ path: join(shotDir, 'add-user-modal.png') });
  });
});
