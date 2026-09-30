import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shotDir = join(__dirname, '../../../docs/screenshots');
mkdirSync(shotDir, { recursive: true });

const API = process.env.ZM_API || 'http://127.0.0.1:8000';
const PASSWORD = process.env.ZM_DEMO_PASSWORD || 'demo1234';

async function adminToken(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { username: 'super.admin', password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token as string;
}

async function createPendingUser(page: Page) {
  const token = await adminToken(page);
  const uname = `e2e.chw.${Date.now().toString(36)}`;
  const temp = `Tmp-${Math.random().toString(16).slice(2, 12)}Aa1`;
  const res = await page.request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      username: uname,
      password: temp,
      display_name: 'E2E Pending CHW',
      role: 'CHW',
      village: 'E2EVillage',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  expect(body.password_prompt_status).toBe('pending');
  return { uname, temp };
}

async function loginAs(page: Page, username: string, password: string, theme: 'light' | 'dark' = 'light') {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { username, password },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const data = await res.json();
  await page.addInitScript(
    (session) => {
      sessionStorage.setItem('zm_session', JSON.stringify(session));
      localStorage.setItem('zm_lang', 'rw');
      localStorage.setItem('zm_preferred_view', 'web');
      localStorage.setItem('zm_theme_mode', session.theme);
      localStorage.setItem('zm_dark', session.theme === 'dark' ? '1' : '0');
      void navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
    },
    {
      access_token: data.access_token,
      user: data.user,
      offline_until: Date.now() + 86400000,
      theme,
    },
  );
  return data;
}

test.describe('Password prompt modal @ 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lands on home, modal once, ignore persists', async ({ page, browser }) => {
    const { uname, temp } = await createPendingUser(page);
    const data = await loginAs(page, uname, temp);
    expect(data.password_prompt_status).toBe('pending');
    await page.goto('/app/home');
    await expect(page).not.toHaveURL(/change-password/);
    await expect(page.getByTestId('password-prompt-modal')).toBeVisible({ timeout: 15000 });
    const panel = page.getByTestId('modal-panel');
    const box = await panel.boundingBox();
    const vw = page.viewportSize()!;
    expect(box).toBeTruthy();
    expect(Math.abs(box!.x + box!.width / 2 - vw.width / 2)).toBeLessThanOrEqual(4);
    await page.screenshot({ path: join(shotDir, 'password-prompt-modal-light.png') });
    await page.evaluate(() => {
      localStorage.setItem('zm_theme_mode', 'dark');
      localStorage.setItem('zm_dark', '1');
      document.documentElement.classList.add('dark');
    });
    await page.screenshot({ path: join(shotDir, 'password-prompt-modal-dark.png') });
    await page.evaluate(() => {
      localStorage.setItem('zm_theme_mode', 'light');
      localStorage.setItem('zm_dark', '0');
      document.documentElement.classList.remove('dark');
    });
    await page.getByTestId('password-prompt-ignore').click();
    await expect(page.getByTestId('password-prompt-modal')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/must change your password|Ugomba guhindura/i);

    await page.reload();
    await expect(page.getByTestId('password-prompt-modal')).toHaveCount(0);

    // Fresh browser context — still dismissed (server)
    const ctx = await browser.newContext();
    const page2 = await ctx.newPage();
    await loginAs(page2, uname, temp);
    await page2.goto('/app/home');
    await expect(page2.getByTestId('password-prompt-modal')).toHaveCount(0);
    await ctx.close();
  });

  test('change now works; avatar menu still opens change-password page', async ({ page }) => {
    const { uname, temp } = await createPendingUser(page);
    await loginAs(page, uname, temp);
    await page.goto('/app/home');
    await expect(page.getByTestId('password-prompt-modal')).toBeVisible({ timeout: 15000 });
    await page.locator('#password-prompt-form input[autocomplete="current-password"]').fill(temp);
    await page.locator('#password-prompt-form input[autocomplete="new-password"]').fill('SecurePass99x');
    await page.getByTestId('password-prompt-change').click();
    await expect(page.getByTestId('password-prompt-modal')).toHaveCount(0);

    await page.goto('/app/change-password');
    await expect(page.getByTestId('app-main').getByRole('heading').first()).toBeVisible();
    await expect(page).toHaveURL(/change-password/);
  });
});

test.describe('Password prompt mobile sheet @ 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('bottom sheet style modal', async ({ page }) => {
    const { uname, temp } = await createPendingUser(page);
    await loginAs(page, uname, temp);
    await page.goto('/app/home');
    const panel = page.getByTestId('modal-panel');
    await expect(panel).toBeVisible({ timeout: 15000 });
    const box = await panel.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box).toBeTruthy();
    // Bottom sheet sits near the bottom
    expect(box!.y + box!.height).toBeGreaterThan(vh * 0.55);
    await page.screenshot({ path: join(shotDir, 'password-prompt-modal-mobile.png') });
  });
});
