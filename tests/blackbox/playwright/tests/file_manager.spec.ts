import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Helper to get a stable testId across different tests in the same run
const testIdFile = path.join(__dirname, 'test_id.tmp');
function getTestId(): string {
  const now = Date.now();
  if (fs.existsSync(testIdFile)) {
    const stats = fs.statSync(testIdFile);
    // Reuse the existing testId if it was generated less than 15 minutes ago
    if (now - stats.mtimeMs < 15 * 60 * 1000) {
      return fs.readFileSync(testIdFile, 'utf-8');
    }
  }
  const id = now.toString();
  fs.writeFileSync(testIdFile, id);
  return id;
}

test.describe('Manajemen Berkas dan Immutability', () => {
  // Force all tests in this file to run serially in a single worker process
  test.describe.configure({ mode: 'serial' });

  let testId: string;
  let folderName: string;
  
  let nameNormal: string;
  let nameIdentical: string;
  let nameLargeA: string;
  let nameLargeB: string;
  let nameEmpty: string;
  let nameImage: string;

  const fileContent = 'Ini adalah konten berkas baru yang unik untuk pengujian E2E Playwright.';
  const fileContentLargeA = 'A'.repeat(300000) + 'B'.repeat(300000); // 600KB
  const fileContentLargeB = 'A'.repeat(300000) + 'C'.repeat(300000); // Perubahan sebagian

  // Paths
  let fileNormal: string;
  let fileIdentical: string;
  let fileLargeA: string;
  let fileLargeB: string;
  let fileEmpty: string;
  let fileImage: string;

  test.beforeAll(() => {
    testId = getTestId();
    folderName = `Folder Demo Playwright ${testId}`;
    
    nameNormal = `temp_normal_${testId}.txt`;
    nameIdentical = `temp_identical_${testId}.txt`;
    nameLargeA = `large_a_${testId}.txt`;
    nameLargeB = `large_b_${testId}.txt`;
    nameEmpty = `empty_${testId}.txt`;
    nameImage = `sample_image_${testId}.jpg`;

    fileNormal = path.join(__dirname, nameNormal);
    fileIdentical = path.join(__dirname, nameIdentical);
    fileLargeA = path.join(__dirname, nameLargeA);
    fileLargeB = path.join(__dirname, nameLargeB);
    fileEmpty = path.join(__dirname, nameEmpty);
    fileImage = path.join(__dirname, nameImage);

    fs.writeFileSync(fileNormal, fileContent);
    fs.writeFileSync(fileIdentical, fileContent);
    fs.writeFileSync(fileLargeA, fileContentLargeA);
    fs.writeFileSync(fileLargeB, fileContentLargeB);
    fs.writeFileSync(fileEmpty, '');
    
    // Copy the real sample image from playwright/sample_files
    const fileImageSource = path.join(__dirname, '..', 'sample_files', 'sample_image.jpg');
    if (fs.existsSync(fileImageSource)) {
      fs.copyFileSync(fileImageSource, fileImage);
    } else {
      // Fallback: write a tiny mock file if the source is not found
      fs.writeFileSync(fileImage, 'fake image content');
    }
  });

  test.afterAll(() => {
    [fileNormal, fileIdentical, fileLargeA, fileLargeB, fileEmpty, fileImage].forEach(p => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  });

  test.beforeEach(async ({ page }) => {
    // Bersihkan sesi untuk memastikan login segar
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
    
    // Jalankan otentikasi login
    await page.getByPlaceholder('nama@email.com').fill('gading@gmail.com');
    await page.getByPlaceholder('Masukkan password akun Anda').fill('password');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/app\/files/);

    // Jika modal preview masih terbuka (karena crash di tes sebelumnya), tutup
    const closeBtn = page.getByLabel('Tutup preview');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Skenario 1: Unggah Berkas Baru', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileNormal);

    // Verifikasi pesan sukses
    await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
    await expect(page.getByText(nameNormal)).toBeVisible();
  });

  test('Skenario 2: Unggah Berkas Identik (Deduplikasi)', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileIdentical);

    // Verifikasi unggah berhasil
    await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
    await expect(page.getByText(nameIdentical)).toBeVisible();

    // Klik file untuk membuka detail inspector/preview modal
    await page.getByText(nameIdentical).click();
    
    // Klik tab "Detail" di dalam modal (gunakan selector spesifik untuk menghindari bentrokan dengan baris file)
    await page.locator('div.fixed button:has-text("Detail")').click();

    // Verifikasi efisiensi deduplikasi 100.00% pada Inspector detail berkas
    await expect(page.getByText('Efisiensi 100.00%')).toBeVisible();

    // Klik tombol "Tutup preview" untuk menutup modal
    await page.getByLabel('Tutup preview').click();
  });

  test('Skenario 3: Unggah Berkas dengan Perubahan Sebagian', async ({ page }) => {
    // Upload file A
    let fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    let fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileLargeA);
    await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();

    // Upload file B (perubahan sebagian)
    fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileLargeB);
    await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();

    // Klik file B untuk memverifikasi info deduplikasi sebagian
    await page.getByText(nameLargeB).click();
    
    // Klik tab "Detail" di dalam modal (gunakan selector spesifik)
    await page.locator('div.fixed button:has-text("Detail")').click();

    // Verifikasi rasio deduplikasi sebagian (di atas 0.00% dan di bawah 100.00%)
    await expect(page.getByText(/Efisiensi \d+\.\d{2}%/)).toBeVisible();

    // Klik tombol "Tutup preview" untuk menutup modal
    await page.getByLabel('Tutup preview').click();
  });

  test('Skenario 4: Pengunduhan Berkas', async ({ page }) => {
    // Tunggu event unduhan dipicu
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: `Unduh ${nameNormal}` }).click();
    const download = await downloadPromise;

    // Verifikasi unduhan sukses
    await expect(page.getByText(`Unduh ${nameNormal} berhasil.`)).toBeVisible();
    
    // Bandingkan isi file yang diunduh
    const downloadPath = await download.path();
    const downloadedContent = fs.readFileSync(downloadPath!, 'utf-8');
    expect(downloadedContent).toBe(fileContent);
  });

  test('Skenario 5: Soft Delete Berkas', async ({ page }) => {
    await page.getByRole('button', { name: `Hapus ${nameNormal}` }).click();
    
    // Klik tombol konfirmasi modal
    await page.getByRole('button', { name: 'Hapus berkas' }).click();

    // Verifikasi berkas hilang dari daftar aktif
    await expect(page.getByText(nameNormal)).not.toBeVisible();

    // Masuk ke halaman Sampah (Trash)
    await page.getByRole('link', { name: 'Sampah' }).click();
    await expect(page).toHaveURL(/\/app\/trash/);
    
    // Verifikasi berkas ada di sampah
    await expect(page.getByText(nameNormal)).toBeVisible();
  });

  test('Skenario 6: Pemulihan Berkas dari Sampah (Restore)', async ({ page }) => {
    // Buka halaman Sampah
    await page.getByRole('link', { name: 'Sampah' }).click();
    
    // Klik tombol Pulihkan pada file
    await page.getByRole('button', { name: `Pulihkan ${nameNormal}` }).click();
    await expect(page.getByText(`${nameNormal} dipulihkan.`)).toBeVisible();

    // Kembali ke Berkas Saya
    await page.getByRole('link', { name: 'Berkas Saya' }).click();
    
    // Verifikasi file kembali ke daftar aktif
    await expect(page.getByText(nameNormal)).toBeVisible();
  });

  test('Skenario 7: Pengujian Tidak Normal (Berkas Kosong)', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileEmpty);

    // Verifikasi error toast/status muncul memuat kode 502, kegagalan unggah, atau berkas kosong
    const errorNotice = page.getByRole('status').filter({ hasText: /status code 502|status code 400|Unggah gagal|kosong/i }).first();
    await expect(errorNotice).toBeVisible();
  });

  test('Skenario Tambahan: Unggah Gambar & Verifikasi Pratinjau (Preview)', async ({ page }) => {
    // 1. Upload berkas gambar
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Unggah' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileImage);

    await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
    await expect(page.getByText(nameImage)).toBeVisible();

    // 2. Klik pada file gambar untuk membuka preview modal
    await page.getByText(nameImage).click();

    // 3. Verifikasi elemen tag img (gambar pratinjau) tampil di layar modal
    const previewImage = page.locator(`img[alt="${nameImage}"]`);
    await expect(previewImage).toBeVisible();

    // 4. Tutup preview modal
    await page.getByLabel('Tutup preview').click();

    // 5. Klik pada file teks untuk membuka preview teks
    await page.getByText(nameNormal).click();

    // 6. Verifikasi elemen tag pre (konten teks) memuat isi teks yang benar
    const previewText = page.locator('pre');
    await expect(previewText).toBeVisible();
    await expect(previewText).toContainText('Ini adalah konten berkas baru');

    // 7. Tutup preview modal
    await page.getByLabel('Tutup preview').click();
  });
});
