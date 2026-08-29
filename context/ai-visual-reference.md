# Referensi visual maskot dan style AI

## Peran tiap asset

- [HashBox auth illustration](../environment-a/web-client/public/hashbox-auth-illustration.png) adalah **referensi style visual saja**. Ambil art direction, rendering, material, lighting, dan paletnya; jangan menyalin layout atau komposisinya.
- [Turnaround maskot](assets/hashbox-mascot-turnaround-reference.png) adalah **referensi identitas dan proporsi maskot**. Gunakan untuk menjaga bentuk kepala, wajah, armor, emblem, dan detail dari semua arah.
- `hashbox-cas-pipeline.png` adalah **asset dark yang sudah disetujui** untuk area CAS/pipeline. Pertahankan desain dan nuansa dark-nya; jangan menggantinya dengan layout auth atau desain alternatif tanpa instruksi khusus.
- `hashbox-mascot-landing-hero.png` adalah **asset light dengan layout hero lama**. Jika direvisi, pertahankan hierarki komposisinya: maskot besar di tengah di belakang vault, cloud, folder, shield, panel, database, dan elemen floating di sekelilingnya.
- `hashbox-mascot-file-guide.png`, `hashbox-mascot-guide.png`, dan `hashbox-mascot-cta.png` adalah **asset preserve-layout**. Pertahankan pose, susunan objek, dan fungsi visual asal; ubah hanya style dan identitas maskot agar konsisten.
- `hashbox-user-admin-workflow.png` adalah **asset redesign total**. Gunakan alur bersih tiga zona: pengguna, vault/maskot, dan admin; jangan mengembalikan layout lama yang ramai.

## Identitas maskot

Pertahankan:

- robot futuristik yang compact dan ramah;
- kepala putih rounded-rectangle dengan layar wajah navy;
- dua mata melengkung mint;
- modul samping dan aksen atas orange-yellow;
- armor tubuh putih dan navy dengan aksen orange;
- sarung tangan dan sepatu navy;
- emblem hexagonal security/lock pada bagian dada dengan core orange/yellow;
- proporsi yang konsisten pada setiap pose dan sudut pandang.

## Panduan style generate gambar

Gunakan auth illustration sebagai acuan visual, bukan acuan susunan objek:

- polished friendly stylized 3D product illustration;
- bentuk rounded, bevel lembut, siluet bersih, dan gradient halus;
- soft shadow terkontrol dengan material matte-to-satin;
- bentuk dimensional sederhana, bukan photorealistic 3D;
- palet warm white, deep navy, mint/teal, orange/yellow, dan peach/coral;
- asset light memakai warm white atau peach sebagai dasar;
- asset dark memakai deep navy dengan aksen mint dan peach yang terkendali.

Setiap prompt harus menyebutkan peran input secara eksplisit: `style reference`, `mascot reference`, dan `layout/edit target`. Jangan menganggap style reference sebagai layout reference.

Untuk asset preserve-layout, jangan memindahkan, menghapus, atau menambah elemen utama. Untuk asset redesign total, prioritaskan hierarki yang sederhana, whitespace, dan satu alur visual yang mudah dibaca.

Prompt style singkat:

> Match the HashBox auth illustration style only: friendly polished stylized 3D product illustration, soft rounded bevels, clean vector-like silhouettes, gentle gradients, controlled soft shadows, matte-to-satin surfaces, warm white/deep navy/mint/orange/peach palette. Preserve the requested target composition; do not copy the auth illustration layout. Not photorealistic, not hyper-glossy, not neon cyberpunk.

Hindari robot alternatif, antenna, mata biru menyala, palet biru neon dominan, layout turnaround, typography acak, watermark, dan logo baru. Jangan menambahkan karakter, props, senjata, atau kostum tanpa instruksi khusus.
