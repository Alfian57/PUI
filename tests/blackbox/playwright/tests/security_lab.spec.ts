import { test, expect } from '@playwright/test';

/**
 * Security Lab — automated visual demo (Tipe 1).
 *
 * Drives the real browser through the Security Lab page, runs the ransomware
 * mitigation scenario, and asserts the factual outcomes surfaced in the UI.
 * This is the presentation-facing counterpart to the headless Go integration
 * test (Tipe 2); both exercise the same SecurityLabService.
 *
 * Prerequisites:
 *  - Stack running (make compose-up).
 *  - api-service: SECURITY_LAB_ENABLED=true.
 *  - web-client: VITE_SECURITY_LAB_ENABLED=true.
 *  - Dev user seeded (gading@gmail.com / password).
 *
 * Run: make security-demo   (headed, for presenting)
 */
test.describe('Security Lab — Simulasi Mitigasi Ransomware', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');

    await page.getByPlaceholder('nama@email.com').fill('gading@gmail.com');
    await page.getByPlaceholder('Masukkan password akun Anda').fill('password');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/app\/files/);
  });

  test('Menjalankan skenario serangan dan membuktikan data tetap utuh', async ({ page }) => {
    // Navigate to the Security Lab page (route is env-gated; must be enabled).
    await page.goto('/app/security-lab');
    await expect(page.getByTestId('security-lab-page')).toBeVisible();

    // Start the simulation.
    await page.getByTestId('security-run').click();

    // The summary appears once the full scenario completes. Allow generous time
    // because it performs real uploads, deletions, and UDS round-trips.
    const summary = page.getByTestId('security-summary');
    await expect(summary).toBeVisible({ timeout: 60_000 });

    // All five phases must have rendered.
    for (const phase of ['BEFORE', 'ATTACK_APP', 'PROOF', 'ATTACK_UDS', 'AFTER']) {
      await expect(page.locator(`[data-testid="security-phase"][data-phase="${phase}"]`)).toBeVisible();
    }

    // The UDS attack phase must show at least one "blocked" event from Vault Core.
    const blockedEvents = page.locator('[data-testid="security-event"][data-status="blocked"]');
    expect(await blockedEvents.count()).toBeGreaterThan(0);

    // The raw rejection contract must be visible for examiner verification.
    await expect(page.getByText('operation_forbidden').first()).toBeVisible();

    // No security breach events should be present.
    await expect(page.locator('[data-testid="security-event"][data-status="breach"]')).toHaveCount(0);

    // Final verdict: the scenario passed (all invariants held).
    await expect(summary).toHaveAttribute('data-passed', 'true');
    await expect(summary.getByText('Semua invariant keamanan terjaga')).toBeVisible();
  });
});
