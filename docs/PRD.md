# PRD — Nexalora

- **Versi:** 1.0
- **Status:** Baseline pengembangan
- **Tanggal dokumen sumber:** 13 Oktober 2026
- **Konteks:** Hackathon JOINTS UGM 2026, subtema Education
- **Cakupan:** Rekomendasi studi, simulasi pengalaman belajar, perbandingan prodi-kampus, eksplorasi & rencana karier 30 hari, Paspor Studi & Karier

## 1. Ringkasan eksekutif

Nexalora adalah aplikasi web eksplorasi studi dan karier untuk siswa SMA kelas XI–XII (*"Rasakan belajarnya. Pertimbangkan pilihannya. Rencanakan langkah berikutnya"*). Aplikasi ini membantu siswa mengeksplorasi pilihan studi dan karier melalui profil diri, pengalaman belajar singkat lintas jurusan, perbandingan program studi-kampus dengan skenario biaya/lokasi, serta rencana tindakan 30 hari.

Nilai inti: menghubungkan satu alur utuh dari pengalaman belajar lintas jurusan menuju alasan pilihan yang jelas, pertimbangan biaya/lokasi yang realistis, dan rencana tindakan nyata yang dapat didiskusikan bersama guru BK serta keluarga.

Nexalora **tidak** mendiagnosis bakat/IQ, **tidak** memprediksi peluang lolos penerimaan kampus (SNBP/SNBT), **tidak** menjamin perolehan beasiswa atau pekerjaan, dan **tidak** menilai seluruh potensi siswa dari satu simulasi singkat.

## 2. Latar belakang dan masalah

1. **Nama jurusan lebih dikenal daripada aktivitas belajarnya:** Pilihan siswa sering bertumpu pada citra jurusan atau profesi, bukan pemahaman atas apa yang dipelajari sehari-hari.
2. **Minat, nilai, lokasi, dan biaya dipertimbangkan secara terpisah:** Siswa sulit melihat pertukaran (*trade-off*) antaropsi ketika menyusun *shortlist*.
3. **Informasi belum berubah menjadi langkah berikutnya:** Eksplorasi berhenti setelah melihat hasil rekomendasi tanpa menghasilkan tindakan spesifik.

Klaim bahwa platform yang ada (seperti Aku Pintar untuk asesmen minat atau Forage untuk simulasi kerja) belum memiliki alur serupa tidak digunakan sebagai klaim mutlak. Pembeda yang diuji Nexalora adalah integrasi satu alur dari pengalaman belajar singkat menuju alasan pilihan, kelayakan praktis, dan rencana karier 30 hari.

## 3. Tujuan produk

1. Siswa mampu menyebutkan alasan dan batas pengetahuan tentang pilihan studinya.
2. Siswa mencoba sedikitnya satu aktivitas belajar relevan melalui simulasi interaktif.
3. Siswa menyusun rencana eksplorasi atau persiapan studi & karier selama 30 hari (minimal 3 tindakan spesifik).

### Sasaran pilot dan ukuran hasil

| Metrik | Target | Cara ukur |
|---|---|---|
| Penyelesaian alur inti | Minimal 4 dari 5 siswa pertama menyelesaikan 1 misi, refleksi, dan 3 tindakan tanpa intervensi besar | Observasi sesi pilot (5–8 siswa, 1 guru BK) |
| Kejelasan alasan pilihan | Siswa mampu menyebutkan 2 aktivitas belajar dan 1 pertimbangan praktis sebelum/sesudah sesi | Rubrik sederhana sebelum dan sesudah sesi |
| Performa UI utama | ≤ 3 detik pada perangkat/jaringan uji yang dicatat | Log performa browser/server |
| Waktu respons rekomendasi & run misi | p95 ≤ 2 detik untuk ukuran katalog MVP | Pengujian beban skenario representatif |
| Kebocoran data lintas akun | 0 kasus | Pengujian otomatis otorisasi & RLS |

## 4. Pengguna dan peran

| Peran | Kode / Aktor | Kebutuhan utama |
|---|---|---|
| Siswa (Pengguna Utama) | `STUDENT` | Mencoba simulasi, melihat rekomendasi transparan, membandingkan biaya/lokasi, menyusun rencana 30 hari, dan mengekspor Paspor Studi & Karier |
| Siswa Mode Demo | `DEMO` | Mencoba produk dengan profil sintetis tanpa memasukkan data pribadi |
| Guru BK / Keluarga | Pendamping (via Paspor) | Membahas bukti pengalaman dan tindakan berikutnya melalui dokumen Paspor yang dibagikan secara sadar oleh siswa (tanpa dashboard khusus di P0) |
| Kurator Tim | `CURATOR` | Memastikan katalog kampus, biaya, kurikulum, beasiswa, dan misi memiliki sumber resmi, tahun, dan berstatus `PUBLISHED` |

## 5. Ruang lingkup

### MVP / P0 (Wajib)

- **F01 — Akses, profil, dan penyimpanan:** Mode demo sintetis; akun pribadi (Supabase Auth); *autosave draft* per langkah; pencatatan persetujuan (*consent*).
- **F02 — Eksplorasi minat dan bekal akademik:** Instrumen 12 pertanyaan aktivitas (skala 1–5 + `UNKNOWN`/`SKIPPED`); input nilai rapor opsional per mapel/semester.
- **F03 — Mesin rekomendasi studi:** Rekomendasi jurusan lalu prodi-kampus; memisahkan relevansi minat, bekal akademik, dan kelayakan biaya/lokasi; alasan berbasis `evidence_id`.
- **F04 — Simulasi pengalaman belajar:** Tiga misi pada studi kasus *"Benahi Kantin Sekolah"*: Informatika (*Pesanan Tanpa Tabrakan*), Teknik Industri (*Antrean Bergerak*), dan DKV (*Menu yang Terbaca*).
- **F05 — Refleksi dan peninjauan pilihan:** Form refleksi pasca-misi; pratinjau perubahan urutan rekomendasi (`R = 0.7 * I + 0.3 * F`); skor tugas/hint tidak mengurangi minat.
- **F06 — Perbandingan dan uji skenario:** Bandingkan maksimal 3 prodi-kampus; fitur *"Bagaimana jika?"* (*what-if*) untuk mengubah anggaran/lokasi sementara tanpa menimpa profil permanen.
- **F07 — Kurikulum dan bantuan biaya:** Kartu kurikulum resmi dan informasi beasiswa/KIP-K bersumber resmi dengan penanda tahun dan `checked_at`.
- **F08 — Eksplorasi arah karier dan rencana 30 hari:** 6 kartu peran karier awal (relasi *many-to-many* ke jurusan & *skill*); generator rencana 30 hari deterministik berisi minimal 3 tugas.
- **F09 — Beranda dan Paspor Studi & Karier:** Beranda berorientasi satu tindakan berikutnya; *snapshot* paspor *immutable* dengan fitur *redaction* (sembunyikan nilai/anggaran) siap cetak A4/PDF.
- **F10 — Kurasi dan publikasi konten:** Validasi berkas *seed* JSON/CSV dengan kewajiban `source_id` untuk fakta kampus; tanpa CMS visual penuh.

### P1 (Penyempurnaan setelah P0 stabil)

- AI penjelas (*AI Explainer*) dengan batas *timeout* 8 detik dan *fallback* ke *template* deterministik.
- Dashboard khusus guru BK, ekspor PDF *server-side*, notifikasi pengingat, dan editor konten visual.

### P2 (Di luar MVP)

- Katalog seluruh kampus nasional & *scraper* otomatis.
- Integrasi pendaftaran kampus atau pendaftaran beasiswa langsung.
- Asesmen psikometrik profesional, komunitas/mentor, dan prediksi gaji/pasar kerja.

## 6. Asumsi dan batasan

- Target katalog awal: 3 rumpun jurusan (Informatika, Teknik Industri, DKV), sekitar 6 pasangan prodi-kampus nyata yang terverifikasi, 3 misi simulasi, dan 6 kartu peran karier.
- Tidak meminta NIK, NISN, alamat rumah rinci, foto rapor, atau dokumen penghasilan di MVP.
- Biaya yang tidak diketahui (`null`) tidak pernah dianggap gratis (`0`).
- Seluruh contoh perhitungan biaya, parameter simulasi, dan bobot rekomendasi adalah heuristik awal yang transparan, bukan ketetapan ilmiah atau tarif resmi kampus.

## 7. Alur pengguna utama

1. **Masuk / Coba Demo:** Siswa memilih mode demo sintetis atau membuat akun pribadi dan menyetujui pemrosesan data (*consent*).
2. **Profil & Minat:** Siswa mengisi konteks kelas, preferensi lokasi/anggaran (boleh ditunda), nilai rapor (opsional), dan 12 butir aktivitas minat.
3. **Pilihan Awal:** Sistem menampilkan rekomendasi jurusan dan prodi-kampus beserta alasan (`evidence_id`), kelengkapan data, dan status biaya.
4. **Simulasi & Refleksi:** Siswa mengerjakan misi simulasi (Informatika/TI/DKV), menghadapi skenario perubahan kondisi, merevisi solusi, lalu mengisi refleksi dan meninjau perubahan rekomendasi.
5. **Bandingkan Pilihan:** Siswa membandingkan 2–3 prodi-kampus dan menguji skenario perubahan anggaran/tempat tinggal (*what-if*).
6. **Jelajahi Karier:** Siswa mengeksplorasi peran karier terkait, aktivitas kerja, dan keterampilan yang dibutuhkan (atau memilih *"Masih mengeksplorasi"*).
7. **Rencana 30 Hari:** Sistem menghasilkan draf tugas 30 hari berdasarkan tujuan dan waktu mingguan; siswa mengonfirmasi dan memperbarui bukti kemajuan tugas.
8. **Paspor & Tinjau Ulang:** Siswa memilih data yang ingin ditampilkan (menyembunyikan data sensitif secara *default*) dan mencetak Paspor Studi & Karier.

## 8. Rancangan API & Arsitektur

Detail *request/response*, *enum*, *error*, dan aturan otorisasi dijabarkan pada `docs/api-contract.md` dan `docs/architecture.md`.

| Lapisan | Pilihan Teknologi |
|---|---|
| Backend | NestJS, TypeScript, REST API, Zod validation, JWT Auth Guard (Supabase) |
| Database | PostgreSQL (Supabase) + Prisma ORM (migration & seed tervalidasi) |
| Domain Engine | Fungsi TypeScript murni (`src/domain/`) tanpa akses DB langsung untuk rekomendasi, biaya, simulasi, dan planner |
| Testing | Jest / Vitest untuk unit test *domain engine* & *golden fixture*, Supertest untuk E2E/integrasi API |
| Dokumentasi API | Swagger / OpenAPI (`/docs`) via `@nestjs/swagger` |
| Repository | Terpisah (Single-app NestJS Backend Repository) |

## 9. Rencana pengujian penerimaan (T01–T16)

Seluruh skenario uji wajib (`T01` s.d. `T16`) dirinci dalam `docs/business-rules.md` dan `docs/architecture.md`, mencakup isolasi data antar akun (`T01`), penanganan nilai `UNKNOWN` (`T02`, `T04`), determinisme rekomendasi & simulasi (`T03`, `T06`, `T07`, `T08`), keadilan refleksi (`T09`), isolasi skenario *what-if* (`T10`), validitas sumber (`T11`), fleksibilitas *planner* (`T12`, `T13`), *redaction* paspor (`T14`), konflik versi/idempotensi (`T15`), serta ketahanan tanpa AI (`T16`).