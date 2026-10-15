# Business Rules — Nexalora

Dokumen ini adalah sumber kebenaran aturan bisnis, rumus perhitungan, dan invarian domain **Nexalora**. **Jangan mengubah rumus, bobot, atau aturan tanpa konfirmasi.** Setiap aturan memiliki kriteria uji yang menjadi dasar *unit test* dan *integration test*. Sumber asal: PRD Nexalora Bagian 04, 06, dan 07.

## 1. Parameter & Konstanta Domain

Seluruh parameter heuristik awal disimpan dalam konfigurasi aturan berversi (`ruleVersion = 'heuristic-v1'`).

| Kunci Parameter | Nilai Awal | Arti & Penggunaan |
|---|---|---|
| `INSTRUMENT_VERSION` | `'v0.1'` | Versi instrumen 12 butir pertanyaan aktivitas minat |
| `MIN_ITEMS_PER_DIMENSION` | `2` | Minimal butir terjawab (dari 3 butir) agar 1 dimensi minat dianggap tersedia |
| `MIN_AVAILABLE_DIMENSIONS` | `3` | Minimal dimensi tersedia (dari 4 dimensi) agar personalisasi urutan rekomendasi aktif |
| `WEIGHT_INITIAL_INTEREST` | `0.70` | Bobot relevansi minat awal `I(j)` dalam rumus gabungan pasca-refleksi `R(j)` |
| `WEIGHT_REFLECTION` | `0.30` | Bobot refleksi `F(j)` dalam rumus gabungan `R(j)` |
| `SEMESTER_MONTHS_DEFAULT` | `6` | Pembagi jumlah bulan per semester untuk perhitungan biaya bulanan ekuivalen |
| `MAX_SHORTLIST_PROGRAMS` | `3` | Jumlah maksimal pasangan prodi-kampus yang dapat dibandingkan sekaligus |
| `PLAN_DURATION_DAYS` | `30` | Rentang hari rencana tindakan (`startDate` s.d. `startDate + 29 hari`) |
| `MIN_PLAN_TASKS` | `3` | Jumlah minimal tugas spesifik dalam satu rencana 30 hari |
| `INF_MAX_EXECUTION_STEPS` | `50` | Batas maksimum langkah eksekusi *graph* pada misi Informatika untuk mencegah *infinite loop* |
| `IND_SIMULATION_HORIZON_SEC` | `600` | Horizon waktu simulasi antrean Teknik Industri (dalam detik) |
| `AI_EXPLAINER_TIMEOUT_MS` | `8000` | Batas waktu tunggu maksimal AI penjelas (P1) sebelum jatuh ke *template* deterministik |

### Matriks Bobot Heuristik Jurusan (`heuristic-v1`)

Urutan dimensi: `[LOGIC_SYSTEM, PROCESS_DATA, VISUAL_COMM, EXPLORATION_COLLAB]`

| Rumpun Jurusan (`majorId`) | `LOGIC_SYSTEM` | `PROCESS_DATA` | `VISUAL_COMM` | `EXPLORATION_COLLAB` |
|---|---|---|---|---|
| `INF` (Informatika) | `0.55` | `0.20` | `0.10` | `0.15` |
| `IND` (Teknik Industri) | `0.20` | `0.50` | `0.10` | `0.20` |
| `DKV` (Desain Komunikasi Visual) | `0.10` | `0.10` | `0.60` | `0.20` |

## 2. Enum Kontrak

| Kelompok | Nilai Enum |
|---|---|
| `Role` | `STUDENT`, `DEMO`, `CURATOR` |
| `GradeLevel` | `XI`, `XII`, `OTHER` |
| `RelocationMode` | `STAY`, `OPEN`, `SELECTED` |
| `HousingMode` | `FAMILY`, `RENT`, `UNKNOWN` |
| `InterestDimension` | `LOGIC_SYSTEM`, `PROCESS_DATA`, `VISUAL_COMM`, `EXPLORATION_COLLAB` |
| `AnswerState` | Skala integer `1` s.d. `5`, atau `UNKNOWN` (`null`), atau `SKIPPED` (`null`) |
| `AcademicReadinessStatus` | `READY`, `PARTIAL`, `INCOMPLETE` |
| `CostFeasibilityStatus` | `WITHIN_BUDGET`, `DEPENDS_ON_SCENARIO`, `NEEDS_FINANCIAL_AID`, `INSUFFICIENT_DATA` |
| `PublicationStatus` | `DRAFT`, `REVIEWED`, `PUBLISHED`, `STALE`, `ARCHIVED` |
| `AttemptStatus` | `DRAFT`, `RUNNING`, `RESULT_READY`, `COMPLETED` |
| `DifficultyLevel` | `EASY`, `MEDIUM`, `HARD` |
| `ObstacleType` | `MATERIAL_UNFAMILIAR`, `TOOL_DIFFICULTY`, `TIME_CONSTRAINT`, `OTHER` |
| `ExpectationChange` | `MATCHED`, `CHANGED`, `UNKNOWN` |
| `NextInterestAction` | `RETRY_MISSION`, `TRY_OTHER_MAJOR`, `DISCUSS_FIRST` |
| `ScholarshipStatus` | `UPCOMING`, `OPEN`, `CLOSED`, `UNKNOWN` |
| `PlanStatus` | `DRAFT`, `ACTIVE`, `REVIEWED`, `ARCHIVED` |
| `TaskStatus` | `TODO`, `DOING`, `DONE`, `SKIPPED` |

## 3. Aturan Bisnis Inti (R1–R10)

### R1. Pemisahan Dimensi & Perhitungan Relevansi Minat (`F02`, `F03`)
- Instrumen minat terdiri dari 12 butir (3 butir untuk tiap dimensi `InterestDimension`).
- Jawaban `UNKNOWN` ("Belum tahu") atau `SKIPPED` ("Lewati") disimpan sebagai `null` dan **dilarang** diperlakukan sebagai angka `0` (`AC-02A`).
- Satu dimensi $d$ dinyatakan **tersedia** bila minimal 2 dari 3 butir pada dimensi tersebut memiliki jawaban angka $1..5$.
- Nilai normalisasi dimensi $d$:
  $$\text{minat}_d = \frac{\text{mean}(\text{jawaban\_valid}_d) - 1}{4} \in [0, 1]$$
- Jika jumlah dimensi yang tersedia $< 3$, sistem **tidak** menghitung skor urutan personal; kembalikan daftar katalog umum dalam urutan stabil (`AC-03D`).
- Jika $\ge 3$ dimensi tersedia, skor relevansi awal jurusan $j$ dihitung hanya dari dimensi yang tersedia:
  $$I(j) = \frac{\sum_{d \in \text{tersedia}} w_{j,d} \cdot \text{minat}_d}{\sum_{d \in \text{tersedia}} w_{j,d}}$$

### R2. Pembaruan Rekomendasi melalui Refleksi (`F03`, `F05`)
- Ketika siswa menyelesaikan simulasi jurusan $j$ dan menyimpan refleksi dengan nilai `continueInterest` $\in \{1..5\}$ yang ditetapkan aktif, hitung normalisasi refleksi:
  $$F(j) = \frac{\text{continueInterest} - 1}{4} \in [0, 1]$$
- Skor gabungan jurusan $j$:
  $$R(j) = 0.7 \cdot I(j) + 0.3 \cdot F(j)$$
- Jika jurusan $j$ belum memiliki refleksi aktif atau `continueInterest` bernilai `null` (`UNKNOWN`), maka $R(j) = I(j)$ dan status pengalaman jurusan tersebut ditampilkan sebagai `NOT_TRIED` ("Belum dicoba"), **bukan** nilai nol.
- **Aturan Keadilan Mutlak (`AC-05B`):** Waktu penyelesaian simulasi, jumlah penggunaan *hint*, maupun kegagalan memenuhi kasus uji simulasi **tidak boleh** dimasukkan ke dalam rumus $I(j)$, $F(j)$, atau $R(j)$.
- Perubahan urutan rekomendasi tidak langsung menimpa pilihan siswa secara diam-diam; sistem menampilkan pratinjau dan baru membuat `recommendation_run` baru ketika siswa mengeksekusi penerapan (`POST /api/recommendations`). Pilihan yang disematkan manual (`pinnedPrograms`) selalu dipertahankan (`AC-03F`, `AC-05C`).

### R3. Perhitungan Biaya Ekuivalen & Kelayakan Praktis (`F03`, `F06`)
- Setiap `cost_profile` memiliki komponen: `tuitionPerSemester` (min/max), `livingCostMonthly` (min/max), `recurringSupportMonthly` (min/max), dan `upfrontCost` (min/max).
- Rumus **Biaya Bulanan Ekuivalen (Min & Max)**:
  $$\text{MonthlyEquivalent} = \frac{\text{tuitionPerSemester}}{6} + \text{livingCostMonthly} + \text{recurringSupportMonthly}$$
- **Biaya Awal (`upfrontCost`)** dievaluasi secara terpisah terhadap `upfrontBudgetMax` milik siswa.
- Aturan penentuan `CostFeasibilityStatus` terhadap anggaran bulanan maksimum siswa ($B = \text{monthlyBudgetMax}$):
  1. `INSUFFICIENT_DATA`: Jika $B$ bernilai `null` ATAU salah satu komponen biaya wajib (`tuitionPerSemester` atau `livingCostMonthly`) bernilai `null` (`AC-03B`).
  2. `WITHIN_BUDGET`: Semua komponen wajib diketahui dan $\text{MonthlyEquivalent}_{\max} \le B$.
  3. `DEPENDS_ON_SCENARIO`: Semua komponen wajib diketahui dan $\text{MonthlyEquivalent}_{\min} \le B < \text{MonthlyEquivalent}_{\max}$.
  4. `NEEDS_FINANCIAL_AID`: Semua komponen wajib diketahui dan $\text{MonthlyEquivalent}_{\min} > B$.
- Beasiswa/bantuan biaya (seperti KIP Kuliah) hanya dihitung pada mode skenario jika siswa mengaktifkannya secara eksplisit; status *baseline* tanpa bantuan wajib selalu disertakan dalam respons (`AC-03C`).

### R4. Aturan Mesin Simulasi Informatika (`F04A`)
- Misi **Pesanan Tanpa Tabrakan** mengeksekusi *directed graph* berisi tipe blok: `START`, `CHECK_STOCK`, `CHECK_PAYMENT`, `DECREMENT_STOCK`, `ISSUE_TICKET`, `REJECT_ORDER`, `END`.
- Validasi struktur menolak *graph* yang tidak memiliki `START`/`END` atau memiliki cabang `YES`/`NO` yang menggantung (*dangling edge*).
- Jika eksekusi melebihi `INF_MAX_EXECUTION_STEPS` (50 langkah), hentikan eksekusi dengan aman dan kembalikan status siklus terdeteksi (`CYCLE_DETECTED`) tanpa membekukan proses server (`AC-04A2`).
- Empat kasus uji wajib (`INF-01` s.d. `INF-04`):
  - `INF-01` (Normal: `stock=2, qty=1, paymentSuccess=true`) $\rightarrow$ `finalStock=1, ticketsIssued=1, rejected=false`.
  - `INF-02` (Stok Habis: `stock=0, qty=1, paymentSuccess=true`) $\rightarrow$ `finalStock=0, ticketsIssued=0, rejected=true`.
  - `INF-03` (Pembayaran Gagal: `stock=2, qty=1, paymentSuccess=false`) $\rightarrow$ `finalStock=2, ticketsIssued=0, rejected=true` (stok tidak boleh berkurang sebelum pembayaran berhasil).
  - `INF-04` (Alur Rusak/Siklik) $\rightarrow$ ditolak validator atau dihentikan aman oleh *runner*.

### R5. Aturan Mesin Simulasi Teknik Industri & Golden Fixture (`F04B`)
- Misi **Antrean Bergerak** adalah simulasi kejadian diskret (*Discrete-Event Simulation*) deterministik dengan parameter *fixture v1*:
  - Jumlah pelanggan: `12` orang (`C1`..`C12`), datang setiap `30` detik mulai $t = 0\text{ s}$ ($0, 30, 60, \dots, 330$).
  - Tiga tahap berurutan (FCFS): Tahap 1 Terima Pesanan (`20s`), Tahap 2 Siapkan Makanan (`60s`), Tahap 3 Serahkan (`10s`).
  - Kapasitas petugas: `4` petugas pada skenario awal (`scenario_1`), dan `3` petugas pada skenario perubahan kondisi (`scenario_2`).
  - Horizon simulasi: `600` detik.
- Urutan pemrosesan kejadian pada detik $t$ yang sama: (1) Selesaikan layanan yang berakhir pada $t$, (2) Pindahkan pelanggan ke antrean tahap berikutnya, (3) Masukkan kedatangan pelanggan baru pada $t$, (4) Alokasikan petugas yang bebas ke pelanggan terdepan di antrean (seri diselesaikan menurut urutan ID pelanggan).
- **Invarian & Golden Fixture (`AC-04B1`–`AC-04B4`):**
  - Total alokasi petugas $[w_1, w_2, w_3]$ tidak boleh melebihi kapasitas skenario (4 atau 3) dan setiap nilai $\ge 0$.
  - Pada alokasi `[2, 1, 1]` dengan 4 petugas dan horizon `600s`: pelanggan pertama (`C1`) selesai tepat pada $t = 90\text{ s}$, pelanggan kedua (`C2`) selesai pada $t = 150\text{ s}$, dan total pelanggan selesai hingga $t = 600\text{ s}$ adalah **tepat 9 pelanggan** (3 pelanggan masih berada dalam antrean/proses).
  - Seluruh 12 pelanggan wajib terhitung (`completed + inQueue + inProgress == 12`).

### R6. Aturan Mesin Simulasi DKV (`F04C`)
- Misi **Menu yang Terbaca** memeriksa struktur JSON tata letak menu (judul, kategori, daftar item, harga, ukuran font, dan token palet kontras).
- Evaluasi otomatis hanya menghasilkan *checklist* teknis: kelengkapan item/harga wajib, ada/tidaknya teks terpotong (*overflow*), ukuran font minimum ($\ge 12\text{pt}$ untuk isi), rasio kontras palet ($\ge 4.5:1$), dan pengelompokan item sesuai anggaran skenario kedua.
- Sistem **dilarang** mengeluarkan skor estetika, kreativitas, atau bakat artistik.

### R7. Perbandingan & Isolasi Skenario *What-If* (`F06`)
- Siswa dapat memilih maksimal 3 `programId` ke dalam `shortlist`.
- Endpoint `POST /api/scenarios` menghitung ulang status biaya dan lokasi berdasarkan `overrides` (misal perubahan anggaran bulanan atau mode tinggal) terhadap profil versi dasar, tetapi **tidak boleh** mengubah baris `profiles` permanen di database (`AC-06B`, `T10`).

### R8. Generator Rencana 30 Hari & Validasi Tugas (`F08`)
- Rentang rencana 30 hari dihitung menggunakan tanggal kalender lokal `Asia/Jakarta` mulai dari `startDate` hingga `startDate + 29 hari`.
- Tanpa pilihan karier spesifik (`careerGoalIds` kosong), generator tetap menghasilkan minimal 3 tugas eksplorasi deterministik (`AC-08C`, `T12`).
- Setiap `task` dapat memiliki `prerequisiteTaskId` dalam `plan` yang sama; validasi wajib menolak referensinya jika membentuk siklus (*cycle*) atau menunjuk ke `plan` lain.
- Mengubah tujuan rencana (`goalIds`) setelah ada tugas yang berstatus `DONE` akan membuat versi `plan` baru tanpa menghapus riwayat tugas yang sudah selesai (`AC-08E`, `T13`).

### R9. Immutabilitas & Redaksi Paspor (`F09`)
- Pembuatan paspor (`POST /api/passports`) mengambil *snapshot* data pada saat itu dan menyimpannya secara *immutable*.
- Secara *default*, rincian nilai rapor (`academicRecords`), nominal anggaran (`budget`), dan catatan refleksi sensitif **disembunyikan (di-*redact* di sisi server)** kecuali pengguna secara eksplisit memasukkannya ke dalam daftar `includeFields` (`AC-09B`, `T14`). Field yang di-*redact* harus benar-benar dihilangkan dari payload JSON *snapshot* yang disimpan dan dikirim ke browser.

### R10. Redaksi Bahasa & Larangan Klaim (`F02`–`F09`)

| Redaksi yang Diwajibkan (Boleh) | Redaksi yang Dilarang Keras |
|---|---|
| *"Kamu menyatakan tertarik pada aktivitas menyusun aturan..."* | *"Kamu memiliki bakat tinggi di bidang Informatika (Kecocokan 92%)"* |
| *"Dua bidang lain belum dicoba, sehingga perbandingan pengalaman masih terbatas."* | *"Kamu tidak cocok masuk Teknik Industri atau DKV."* |
| *"Informasi biaya hidup belum tersedia; belum dapat disimpulkan terjangkau."* | Menampilkan Rp0 ketika komponen biaya bernilai `null`. |
| *"Ini adalah alasan relevansi eksplorasi, bukan prediksi kelulusan seleksi."* | *"Peluang lolos SNBP kamu di prodi ini tinggi berdasarkan nilai rapor."* |

## 4. Matriks Kasus Uji Wajib (T01–T16)

| Kode | Skenario Uji | Hasil yang Diharapkan (Expect) |
|---|---|---|
| `T01` | Akun A mengakses/mengubah profil, attempt, plan, atau paspor milik Akun B | Ditolak server dengan `403` / `404`; tidak ada data pemilik lain yang bocor |
| `T02` | Siswa melewati input nilai rapor dan menjawab `< 3` dimensi minat | Nilai `UNKNOWN` terjaga; sistem mengembalikan katalog umum tanpa urutan personal |
| `T03` | Input profil, minat, refleksi, dan versi aturan identik dijalankan 2 kali | Urutan jurusan/prodi, alasan (`evidence_id`), dan status biaya 100% identik |
| `T04` | Biaya kuliah diketahui, tetapi biaya hidup `null` | Status biaya adalah `INSUFFICIENT_DATA`, bukan `WITHIN_BUDGET` atau Rp0 |
| `T05` | Mengaktifkan skenario beasiswa potensial lalu kembali ke *baseline* | Hasil membedakan status skenario bantuan dan mempertahankan *baseline* tanpa bantuan |
| `T06` | Misi Informatika dijalankan pada kasus normal, stok habis, gagal bayar, dan *graph* siklik | Invarian `INF-01`..`INF-03` tepat; `INF-04` berhenti aman dalam batas langkah (`<= 50`) |
| `T07` | Misi Teknik Industri dijalankan dengan alokasi `[2,1,1]`, 12 pelanggan, horizon 600s | Tepat 9 pelanggan selesai; `C1` selesai di `90s`, `C2` di `150s`; total pelanggan = 12 |
| `T08` | Misi DKV menyusun menu, mengubah ukuran teks, dan memeriksa hasil | Nama/harga utuh; keluar *checklist* teknis kontras/ukuran tanpa skor kecantikan/estetika |
| `T09` | Siswa memakai semua *hint* dan butuh waktu lama di misi, tapi mengisi `continueInterest = 5` | Skor relevansi $R(j)$ naik sesuai rumus; tidak ada penalti karena *hint* atau durasi |
| `T10` | Siswa mengubah anggaran di skenario *what-if* lalu membatalkan | Data anggaran pada tabel `profiles` permanen tidak berubah |
| `T11` | Beasiswa melewati tanggal tutup atau kurikulum berasal dari tahun lama | Status beasiswa otomatis dievaluasi `CLOSED` / `STALE`; tahun sumber ditampilkan jujur |
| `T12` | Siswa belum memilih peran karier dan memiliki waktu mingguan terbatas | Generator tetap membuat *draft* rencana 30 hari berisi minimal 3 tugas eksplorasi |
| `T13` | Siswa menyelesaikan 1 tugas lalu mengubah tujuan karier pada rencana | Rencana naik versi baru; tugas yang sudah `DONE` tetap tercatat dan tidak terhapus |
| `T14` | Siswa membuat paspor dengan mengecualikan nilai rapor dan anggaran | Objek `snapshot` di DB dan respons API sama sekali tidak memuat nilai/anggaran |
| `T15` | Dua tab mengirim `PATCH` dengan `expectedVersion` lama; retry `POST` dengan `Idempotency-Key` sama | `PATCH` basi ditolak `409 VERSION_CONFLICT`; retry `POST` mengembalikan rekaman yang sama tanpa duplikasi |
| `T16` | Fitur AI dimatikan / *timeout* | Seluruh alur P0 (rekomendasi, simulasi, alasan, rencana 30 hari) tetap berjalan normal dengan *template* |