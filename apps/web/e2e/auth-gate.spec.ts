import { expect, test } from '@playwright/test';

test.describe('Auth gate', () => {
  test('unauthenticated dashboard visit redirects to login', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated users page redirects to login', async ({ page }) => {
    await page.goto('/app/users');
    await expect(page).toHaveURL(/\/login/);
  });
});
