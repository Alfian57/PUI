# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: file_manager.spec.ts >> Manajemen Berkas dan Immutability >> Skenario 2: Unggah Berkas Identik (Deduplikasi)
- Location: tests/file_manager.spec.ts:120:7

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('button', { name: 'Masuk' })
    - locator resolved to <button type="submit" class="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-logoBlue px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow focus:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting 100ms

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as path from 'path';
  3   | import * as fs from 'fs';
  4   | 
  5   | // Helper to get a stable testId across different tests in the same run
  6   | const testIdFile = path.join(__dirname, 'test_id.tmp');
  7   | function getTestId(): string {
  8   |   const now = Date.now();
  9   |   if (fs.existsSync(testIdFile)) {
  10  |     const stats = fs.statSync(testIdFile);
  11  |     // Reuse the existing testId if it was generated less than 15 minutes ago
  12  |     if (now - stats.mtimeMs < 15 * 60 * 1000) {
  13  |       return fs.readFileSync(testIdFile, 'utf-8');
  14  |     }
  15  |   }
  16  |   const id = now.toString();
  17  |   fs.writeFileSync(testIdFile, id);
  18  |   return id;
  19  | }
  20  | 
  21  | test.describe('Manajemen Berkas dan Immutability', () => {
  22  |   // Force all tests in this file to run serially in a single worker process
  23  |   test.describe.configure({ mode: 'serial' });
  24  | 
  25  |   let testId: string;
  26  |   let folderName: string;
  27  |   
  28  |   let nameNormal: string;
  29  |   let nameIdentical: string;
  30  |   let nameLargeA: string;
  31  |   let nameLargeB: string;
  32  |   let nameEmpty: string;
  33  |   let nameImage: string;
  34  | 
  35  |   const fileContent = 'Ini adalah konten berkas baru yang unik untuk pengujian E2E Playwright.';
  36  |   const fileContentLargeA = 'A'.repeat(300000) + 'B'.repeat(300000); // 600KB
  37  |   const fileContentLargeB = 'A'.repeat(300000) + 'C'.repeat(300000); // Perubahan sebagian
  38  | 
  39  |   // Paths
  40  |   let fileNormal: string;
  41  |   let fileIdentical: string;
  42  |   let fileLargeA: string;
  43  |   let fileLargeB: string;
  44  |   let fileEmpty: string;
  45  |   let fileImage: string;
  46  | 
  47  |   test.beforeAll(() => {
  48  |     testId = getTestId();
  49  |     folderName = `Folder Demo Playwright ${testId}`;
  50  |     
  51  |     nameNormal = `temp_normal_${testId}.txt`;
  52  |     nameIdentical = `temp_identical_${testId}.txt`;
  53  |     nameLargeA = `large_a_${testId}.txt`;
  54  |     nameLargeB = `large_b_${testId}.txt`;
  55  |     nameEmpty = `empty_${testId}.txt`;
  56  |     nameImage = `sample_image_${testId}.jpg`;
  57  | 
  58  |     fileNormal = path.join(__dirname, nameNormal);
  59  |     fileIdentical = path.join(__dirname, nameIdentical);
  60  |     fileLargeA = path.join(__dirname, nameLargeA);
  61  |     fileLargeB = path.join(__dirname, nameLargeB);
  62  |     fileEmpty = path.join(__dirname, nameEmpty);
  63  |     fileImage = path.join(__dirname, nameImage);
  64  | 
  65  |     fs.writeFileSync(fileNormal, fileContent);
  66  |     fs.writeFileSync(fileIdentical, fileContent);
  67  |     fs.writeFileSync(fileLargeA, fileContentLargeA);
  68  |     fs.writeFileSync(fileLargeB, fileContentLargeB);
  69  |     fs.writeFileSync(fileEmpty, '');
  70  |     
  71  |     // Copy the real sample image from playwright/sample_files
  72  |     const fileImageSource = path.join(__dirname, '..', 'sample_files', 'sample_image.jpg');
  73  |     if (fs.existsSync(fileImageSource)) {
  74  |       fs.copyFileSync(fileImageSource, fileImage);
  75  |     } else {
  76  |       // Fallback: write a tiny mock file if the source is not found
  77  |       fs.writeFileSync(fileImage, 'fake image content');
  78  |     }
  79  |   });
  80  | 
  81  |   test.afterAll(() => {
  82  |     [fileNormal, fileIdentical, fileLargeA, fileLargeB, fileEmpty, fileImage].forEach(p => {
  83  |       if (p && fs.existsSync(p)) fs.unlinkSync(p);
  84  |     });
  85  |   });
  86  | 
  87  |   test.beforeEach(async ({ page }) => {
  88  |     // Bersihkan sesi untuk memastikan login segar
  89  |     await page.goto('/login');
  90  |     await page.evaluate(() => {
  91  |       localStorage.clear();
  92  |       sessionStorage.clear();
  93  |     });
  94  |     await page.goto('/login');
  95  |     
  96  |     // Jalankan otentikasi login
  97  |     await page.getByPlaceholder('nama@email.com').fill('gading@gmail.com');
  98  |     await page.getByPlaceholder('Masukkan password akun Anda').fill('password');
> 99  |     await page.getByRole('button', { name: 'Masuk' }).click();
      |                                                       ^ Error: locator.click: Test ended.
  100 |     await expect(page).toHaveURL(/\/app\/files/);
  101 | 
  102 |     // Jika modal preview masih terbuka (karena crash di tes sebelumnya), tutup
  103 |     const closeBtn = page.getByLabel('Tutup preview');
  104 |     if (await closeBtn.isVisible()) {
  105 |       await closeBtn.click();
  106 |     }
  107 |   });
  108 | 
  109 |   test('Skenario 1: Unggah Berkas Baru', async ({ page }) => {
  110 |     const fileChooserPromise = page.waitForEvent('filechooser');
  111 |     await page.getByRole('button', { name: 'Unggah' }).click();
  112 |     const fileChooser = await fileChooserPromise;
  113 |     await fileChooser.setFiles(fileNormal);
  114 | 
  115 |     // Verifikasi pesan sukses
  116 |     await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
  117 |     await expect(page.getByText(nameNormal)).toBeVisible();
  118 |   });
  119 | 
  120 |   test('Skenario 2: Unggah Berkas Identik (Deduplikasi)', async ({ page }) => {
  121 |     const fileChooserPromise = page.waitForEvent('filechooser');
  122 |     await page.getByRole('button', { name: 'Unggah' }).click();
  123 |     const fileChooser = await fileChooserPromise;
  124 |     await fileChooser.setFiles(fileIdentical);
  125 | 
  126 |     // Verifikasi unggah berhasil
  127 |     await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
  128 |     await expect(page.getByText(nameIdentical)).toBeVisible();
  129 | 
  130 |     // Klik file untuk membuka detail inspector/preview modal
  131 |     await page.getByText(nameIdentical).click();
  132 |     
  133 |     // Klik tab "Detail" di dalam modal (gunakan selector spesifik untuk menghindari bentrokan dengan baris file)
  134 |     await page.locator('div.fixed button:has-text("Detail")').click();
  135 | 
  136 |     // Verifikasi efisiensi deduplikasi 100.00% pada Inspector detail berkas
  137 |     await expect(page.getByText('Efisiensi 100.00%')).toBeVisible();
  138 | 
  139 |     // Klik tombol "Tutup preview" untuk menutup modal
  140 |     await page.getByLabel('Tutup preview').click();
  141 |   });
  142 | 
  143 |   test('Skenario 3: Unggah Berkas dengan Perubahan Sebagian', async ({ page }) => {
  144 |     // Upload file A
  145 |     let fileChooserPromise = page.waitForEvent('filechooser');
  146 |     await page.getByRole('button', { name: 'Unggah' }).click();
  147 |     let fileChooser = await fileChooserPromise;
  148 |     await fileChooser.setFiles(fileLargeA);
  149 |     await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
  150 | 
  151 |     // Upload file B (perubahan sebagian)
  152 |     fileChooserPromise = page.waitForEvent('filechooser');
  153 |     await page.getByRole('button', { name: 'Unggah' }).click();
  154 |     fileChooser = await fileChooserPromise;
  155 |     await fileChooser.setFiles(fileLargeB);
  156 |     await expect(page.getByText('Unggah berkas berhasil diproses.')).toBeVisible();
  157 | 
  158 |     // Klik file B untuk memverifikasi info deduplikasi sebagian
  159 |     await page.getByText(nameLargeB).click();
  160 |     
  161 |     // Klik tab "Detail" di dalam modal (gunakan selector spesifik)
  162 |     await page.locator('div.fixed button:has-text("Detail")').click();
  163 | 
  164 |     // Verifikasi rasio deduplikasi sebagian (di atas 0.00% dan di bawah 100.00%)
  165 |     await expect(page.getByText(/Efisiensi \d+\.\d{2}%/)).toBeVisible();
  166 | 
  167 |     // Klik tombol "Tutup preview" untuk menutup modal
  168 |     await page.getByLabel('Tutup preview').click();
  169 |   });
  170 | 
  171 |   test('Skenario 4: Pengunduhan Berkas', async ({ page }) => {
  172 |     // Tunggu event unduhan dipicu
  173 |     const downloadPromise = page.waitForEvent('download');
  174 |     await page.getByRole('button', { name: `Unduh ${nameNormal}` }).click();
  175 |     const download = await downloadPromise;
  176 | 
  177 |     // Verifikasi unduhan sukses
  178 |     await expect(page.getByText(`Unduh ${nameNormal} berhasil.`)).toBeVisible();
  179 |     
  180 |     // Bandingkan isi file yang diunduh
  181 |     const downloadPath = await download.path();
  182 |     const downloadedContent = fs.readFileSync(downloadPath!, 'utf-8');
  183 |     expect(downloadedContent).toBe(fileContent);
  184 |   });
  185 | 
  186 |   test('Skenario 5: Soft Delete Berkas', async ({ page }) => {
  187 |     await page.getByRole('button', { name: `Hapus ${nameNormal}` }).click();
  188 |     
  189 |     // Klik tombol konfirmasi modal
  190 |     await page.getByRole('button', { name: 'Hapus berkas' }).click();
  191 | 
  192 |     // Verifikasi berkas hilang dari daftar aktif
  193 |     await expect(page.getByText(nameNormal)).not.toBeVisible();
  194 | 
  195 |     // Masuk ke halaman Sampah (Trash)
  196 |     await page.getByRole('link', { name: 'Sampah' }).click();
  197 |     await expect(page).toHaveURL(/\/app\/trash/);
  198 |     
  199 |     // Verifikasi berkas ada di sampah
```