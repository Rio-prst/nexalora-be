# Domain Context — Nexalora

Dokumen ini menjelaskan konsep domain, istilah, dan batasan dunia nyata di balik **Nexalora** supaya AI Agent tidak menebak istilah, rumus, atau batasan produk. Sumber lengkap: PRD Nexalora (CobaDulu v1.0).

## Masalah yang diselesaikan

Siswa SMA kelas XI–XII dihadapkan pada keputusan memilih jurusan kuliah, kampus, dan arah karier ketika mereka baru mengenal nama jurusan atau citra profesinya saja, belum merasakan aktivitas belajarnya. Selain itu, minat, nilai akademik, preferensi lokasi, dan kemampuan biaya sering dipertimbangkan secara terpisah sehingga siswa kesulitan menyusun *shortlist* yang realistis dan mengubahnya menjadi langkah persiapan nyata.

Nexalora menyatukan empat tahapan dalam satu perjalanan:
1. **Kenali Diri & Pilihan:** memetakan ketertarikan aktivitas, bekal akademik, dan batas biaya/lokasi secara jujur.
2. **Rasakan Belajarnya:** mencoba simulasi masalah nyata (*"Benahi Kantin Sekolah"*) dari sudut pandang tiga jurusan berbeda.
3. **Pertimbangkan Pilihannya:** mengevaluasi kembali pilihan setelah berefleksi dan menguji skenario biaya/lokasi (*"Bagaimana jika?"*).
4. **Rencanakan Langkahnya:** menghubungkan pilihan studi ke peran karier dan menyusun rencana tindakan 30 hari yang terukur di dalam **Paspor Studi & Karier**.

## Posisi produk

- Alat bantu eksplorasi dan pengambilan keputusan bagi siswa bersama guru BK dan keluarga; keputusan akhir tetap berada di tangan siswa.
- **Bukan** alat tes psikologi/IQ tervalidasi, **bukan** mesin prediksi kelulusan SNBP/SNBT, dan **bukan** portal pendaftaran beasiswa otomatis.
- Pembeda yang diuji (**hipotesis produk**): menggabungkan simulasi pengalaman belajar lintas jurusan secara langsung dengan mesin rekomendasi transparan, komparasi biaya/lokasi, dan rencana tindakan 30 hari.
- Jangan pernah menulis klaim di kode, API, atau teks UI bahwa aplikasi ini "menjamin tidak salah jurusan" atau "menghitung persentase peluang lolos kampus".

## Glosarium

| Istilah | Arti dalam sistem dan kode |
|---|---|
| Rumpun Jurusan (`major`) | Bidang ilmu umum yang dieksplorasi siswa. Pada MVP mencakup 3 jurusan: **Informatika**, **Teknik Industri**, dan **Desain Komunikasi Visual (DKV)**. |
| Prodi-Kampus (`program`) | Kombinasi spesifik antara program studi, universitas, lokasi kampus, dan jenjang (mis. S1 Informatika di Kampus X). |
| Instrumen Minat (`interest_submission`) | 12 butir pertanyaan aktivitas versi awal yang dibagi ke dalam 4 dimensi: Logika/Sistem, Proses/Data, Komunikasi Visual, dan Eksplorasi/Kolaborasi. |
| Relevansi Aktivitas (`I(j)`) | Skor internal (0–1) hasil pemetaan berbobot antara jawaban minat siswa dan rumpun jurusan. |
| Skor Refleksi (`F(j)`) | Skor internal (0–1) dari jawaban refleksi `continue_interest` setelah siswa menyelesaikan simulasi jurusan terkait. |
| Skor Eksplorasi Gabungan (`R(j)`) | Skor internal setelah refleksi: `R(j) = 0.7 * I(j) + 0.3 * F(j)`. Jika belum ada refleksi aktif, `R(j) = I(j)`. |
| Profil Biaya (`cost_profile`) | Rincian biaya pendidikan per semester, biaya awal sekali bayar (`upfront`), dan estimasi biaya hidup bulanan pada prodi-kampus, tahun, jalur masuk, dan mode tempat tinggal tertentu. |
| Misi Simulasi (`mission`) | Tugas interaktif berdurasi 8–12 menit dengan tema bersama *"Benahi Kantin Sekolah"* yang memiliki skenario awal, skenario perubahan kondisi, dan pemeriksa aturan deterministik. |
| Percobaan Simulasi (`attempt`) | Rekaman pengerjaan misi oleh seorang siswa, mencakup *seed*, *draft artifact*, hasil eksekusi, dan nomor revisi (`revision`). |
| Refleksi (`reflection`) | Tanggapan subjektif siswa setelah mengerjakan simulasi (`enjoyment`, `continue_interest`, `difficulty`, `obstacle`, dll.). |
| Skenario *What-If* (`scenario`) | Salinan sementara preferensi biaya/lokasi siswa untuk menguji perubahan kelayakan prodi pada halaman perbandingan tanpa mengubah profil utama. |
| Rencana 30 Hari (`plan` & `task`) | Daftar tugas eksplorasi/persiapan selama 30 hari (`start_date` s.d. `start_date + 29 hari` zona waktu `Asia/Jakarta`) dengan minimal 3 tindakan spesifik. |
| Paspor Studi & Karier (`passport`) | *Snapshot immutable* berisi ringkasan profil, alasan pilihan prodi, pengalaman simulasi, kelayakan biaya, arah karier, dan rencana 30 hari yang sudah disensor (*redacted*) sesuai pilihan privasi siswa untuk dicetak ke A4/PDF. |
| Sumber Resmi (`source`) | Tautan dokumen resmi kampus/penyelenggara beserta tahun berlaku (`applicable_year`) dan tanggal verifikasi (`checked_at`). |

## Peran pengguna

| Peran | Enum di Kode | Siapa | Hak Akses Utama |
|---|---|---|---|
| Siswa | `STUDENT` | Siswa SMA kelas XI–XII pemilik akun | Mengelola profil, nilai, minat, rekomendasi, simulasi, refleksi, perbandingan, rencana 30 hari, dan paspor miliknya sendiri. |
| Pengguna Demo | `DEMO` | Pengunjung yang mencoba mode demo | Menggunakan profil sintetis berlabel tetap; tidak dapat mengakses atau mengotori data akun siswa nyata. |
| Kurator | `CURATOR` | Tim internal pengelola konten | Mengelola dan memvalidasi data katalog (`programs`, `missions`, `careers`, `scholarships`, `sources`) melalui *seed*/endpoint kurasi. |

## Situasi nyata yang memengaruhi desain teknis

- **Siswa belum punya semua data sejak awal:** Siswa mungkin belum hafal nilai rapornya, belum tahu anggaran orang tua, atau belum yakin dengan minatnya. Karena itu, ketiadaan data harus disimpan sebagai `null` / `UNKNOWN` dan **tidak boleh** dianggap skor `0` atau biaya Rp0.
- **Perangkat bisa digunakan bergantian di sekolah/warnet:** Saat *logout*, tidak boleh ada data privat atau *state* editor siswa sebelumnya yang tertinggal atau bocor ke akun lain (`AC-01B`, `NFR-01`).
- **Koneksi internet siswa bisa tidak stabil:** Penyimpanan *draft* memakai *optimistic concurrency* (`version` / `revision`) dan pembuatan *attempt* atau *plan* menggunakan `Idempotency-Key` agar klik ganda saat sinyal lambat tidak menggandakan data (`T15`).
- **Hambatan menggunakan alat berbeda dengan ketiadaan minat:** Siswa yang lambat menyelesaikan misi, sering membuka petunjuk (*hint*), atau gagal pada kasus uji simulasi mungkin hanya belum terbiasa dengan antarmuka editor. Karena itu, waktu pengerjaan, jumlah *hint*, dan skor teknis simulasi **dilarang keras** digunakan untuk menurunkan skor rekomendasi jurusan (`AC-05B`, `T09`).

## Batasan produk (tidak boleh dilanggar oleh AI Agent)

1. **Jangan satukan minat, nilai, dan biaya menjadi satu angka "Persentase Kecocokan":** Relevansi aktivitas, kesiapan akademik, dan kelayakan biaya harus selalu dikembalikan sebagai dimensi yang terpisah di API dan UI.
2. **Jangan menghasilkan prediksi lolos kampus:** Field `admissionProbability` tidak boleh dihitung dari nilai rapor (atau harus selalu `null` / dihilangkan).
3. **Jangan gunakan AI/LLM untuk menghitung hasil simulasi atau urutan rekomendasi:** Semua perhitungan rekomendasi, biaya, pemeriksaan misi, dan *preview* rencana 30 hari wajib menggunakan fungsi TypeScript deterministik (`AC-04D`, `AC-08F`).
4. **Jangan mengarang data kampus/kurikulum/beasiswa:** Semua entitas fakta kampus di katalog wajib memiliki rujukan `sourceId` dan tahun yang valid (`AC-07A`, `AC-10A`).
5. **Jangan meminta atau menyimpan PII sensitif:** Tidak ada kolom NIK, NISN, alamat lengkap rumah, tanggal lahir lengkap, atau unggahan file rapor/slip gaji di database.