import { expect, test } from '@playwright/test';

const PASSWORD = process.env.ZM_DEMO_PASSWORD || 'demo1234';

test.describe('Login page — no role selection', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('contains no role names or demo role buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Umujyanama|Umukozi|Umuyobozi|CHW|RBC|Supervisor/i })).toHaveCount(0);
    await expect(page.locator('text=Demo access')).toHaveCount(0);
    await expect(page.locator('text=Demo Access')).toHaveCount(0);
  });

  test('wrong password shows translated error without layout shift on submit', async ({ page }) => {
    await page.goto('/login');
    const submit = page.locator('button[type="submit"]');
    const before = await submit.boundingBox();
    await page.fill('#login-user', 'clarencemutesi');
    await page.fill('#login-pass', 'wrong-password-xx');
    await submit.click();
    await expect(page.getByText(/Izina cyangwa ijambo|Invalid username/i)).toBeVisible({ timeout: 10000 });
    const after = await submit.boundingBox();
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(2);
  });

  test('CHW login lands on home', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-user', 'clarencemutesi');
    await page.fill('#login-pass', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(app\/home|m\/home)/, { timeout: 15000 });
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
