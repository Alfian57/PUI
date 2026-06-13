import { test, expect } from '@playwright/test';

test.describe('Autentikasi Pengguna', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
  });

  test('Berhasil login dengan email dan password yang valid', async ({ page }) => {
    // Verify page content
    await expect(page.locator('h1')).toContainText('Masuk ke HashBox');

    // Fill login form
    await page.getByPlaceholder('nama@email.com').fill('gading@gmail.com');
    await page.getByPlaceholder('Masukkan password akun Anda').fill('password');

    // Submit form
    await page.getByRole('button', { name: 'Masuk' }).click();

    // Verify navigation to dashboard/app
    await expect(page).toHaveURL(/\/app\/files/);

    // Verify presence of file manager elements
    await expect(page.getByRole('heading', { name: 'Berkas Saya', exact: true })).toBeVisible();
  });

  test('Gagal login dengan kredensial yang salah', async ({ page }) => {
    await page.getByPlaceholder('nama@email.com').fill('gading@gmail.com');
    await page.getByPlaceholder('Masukkan password akun Anda').fill('wrongpassword');
    await page.getByRole('button', { name: 'Masuk' }).click();

    // Verify error notice/alert
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Email atau password belum cocok');
  });
});
