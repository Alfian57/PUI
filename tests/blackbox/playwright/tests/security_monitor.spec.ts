import { test, expect } from '@playwright/test';

/**
 * Security monitoring — admin smoke test.
 *
 * Prerequisites:
 *  - Stack running (make compose-up).
 *  - Dev admin seeded (admin@gmail.com / password).
 */
test.describe('Monitoring Keamanan Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');

    await page.getByPlaceholder('nama@email.com').fill('admin@gmail.com');
    await page.getByPlaceholder('Masukkan password akun Anda').fill('password');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/app\/analytics\/overview/);
  });

  test('merender ringkasan, filter, dan histori event keamanan', async ({ page }) => {
    await page.goto('/app/analytics/security');

    await expect(page.getByTestId('security-monitor-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Monitoring Keamanan' })).toBeVisible();
    await expect(page.getByText('Total event', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Tipe event')).toBeVisible();
    await expect(page.getByLabel('Sumber')).toBeVisible();
    await expect(page.getByLabel('Outcome')).toBeVisible();
    await expect(page.getByTestId('security-event-list')).toBeVisible();
  });
});
