# Database — Nexalora

- **Versi:** 1.0
- **Status:** Baseline implementasi
- **Engine:** PostgreSQL (Supabase Cloud)
- **ORM:** Prisma 7 (`prisma-client` generator, driver adapter `@prisma/adapter-pg`)
- **Skema sumber implementasi:** [`prisma/schema.prisma`](../prisma/schema.prisma)
- **Basis:** `docs/erd.md` (atribut & relasi) dan `docs/business-rules.md` §1–§2 (enum & aturan)

Dokumen ini adalah sumber kebenaran **struktur data**. `prisma/schema.prisma` adalah
hasil-hasil teknisnya. Kalau keduanya berbeda, dokumen ini yang menang dan schema
yang harus dikoreksi.

---

## 1. Konvensi

| Konvensi | Aturan |
|---|---|
| Penamaan tabel | `snake_case` jamak (`academic_records`, `recommendation_runs`) via `@@map` |
| Penamaan kolom | `snake_case` via `@map` |
| Penamaan model Prisma | `PascalCase` singular (`AcademicRecord`) |
| Waktu | `timestamptz(6)`, selalu disimpan UTC; konversi ke `Asia/Jakarta` di layer service |
| Tanggal saja | `date` (untuk `plans.start_date`, `tasks.due_date`) |
| Uang | `Int` Rupiah penuh (bukan `Decimal`) |
| PII sensitif | **Dilarang** ada kolom NIK, NISN, alamat rinci, file rapor/slip gaji (DOMAIN-CONTEXT §5) |

### 1.1 Aturan `null` — paling mudah dilanggar

> Kolom nullable berarti **"belum diketahui"**, bukan bernilai `0`.

Berlakuobligatoris untuk: seluruh komponen `cost_profiles.components_json`,
`profiles.monthly_budget_*`, `profiles.upfront_budget_max`, `profiles.city_code`,
`profiles.province_code`, serta nilai minat pada `interest_submissions.answers_json`.

Konsekuensi di API: sistem mengembalikan `INSUFFICIENT_DATA` (bukan `WITHIN_BUDGET`
dan bukan Rp0), dan `admissionProbability` selalu `null`.

### 1.2 Kepemilikan data (ownership)

Seluruh tabel privat berakar dari `profiles.user_id` dan memakai
`ON DELETE CASCADE`. Efeknya: `DELETE /api/account-data` (NFR-04) cukup menghapus
satu baris `profiles` di dalam satu `prisma.$transaction`, dan tidak mungkin
meninggalkan data yatim dari tabel anak.

Pengecualian: `audit_logs` **sengaja** tanpa FK (lihat §4.25).

### 1.3 Optimistic concurrency

Kolom versi berikut wajib dipakai bersama `where` untuk menolak update basi
(T15 / `409 VERSION_CONFLICT`):

| Tabel | Kolom | Endpoint |
|---|---|---|
| `profiles` | `version` | `PATCH /api/profile` (butuh `expectedVersion`) |
| `attempts` | `revision` (+ `last_run_revision`) | `PATCH /api/attempts/:id`, `POST /api/attempts/:id/run` |
| `reflections` | `revision` | `POST /api/reflections` |
| `plans` | `version` | revise rencana 30 hari |
| `tasks` | `version` | `PATCH /api/tasks/:id` (butuh `expectedVersion`) |
| `shortlists` | `base_version` | `PUT /api/shortlist` |

Pola query repository:

```ts
// updateMany + count check = optimistic lock tanpa transaction
const { count } = await prisma.profile.updateMany({
  where: { userId, version: expectedVersion },
  data: { ...changes, version: { increment: 1 } },
});
if (count === 0) throw new VersionConflictError(expectedVersion);
```

### 1.4 Idempotency

`POST /api/attempts` dan `POST /api/plans` mewajibkan header `Idempotency-Key`
(API-CONTRACT §1.1). Constraint-nya:

- `attempts`: `@@unique([user_id, idempotency_key])`
- `plans`: `@@unique([user_id, idempotency_key])`

Retry dengan key sama mengembalikan rekaman yang sama, bukan duplikat. Key dengan
isi berbeda pada resource sama → `409 IDEMPOTENCY_KEY_REUSED`.

---

## 2. Enum

### 2.1 Enum di database

| Enum | Nilai | Dipakai di |
|---|---|---|
| `GradeLevel` | `XI`, `XII`, `OTHER` | `profiles.grade_level` |
| `RelocationMode` | `STAY`, `OPEN`, `SELECTED` | `profiles.relocation_mode` |
| `HousingMode` | `FAMILY`, `RENT`, `UNKNOWN` | `profiles.housing_mode`, `cost_profiles.housing_mode` |
| `PublicationStatus` | `DRAFT`, `REVIEWED`, `PUBLISHED`, `STALE`, `ARCHIVED` | `majors`, `programs`, `missions`, `careers` |
| `ScholarshipStatus` | `UPCOMING`, `OPEN`, `CLOSED`, `UNKNOWN` | `scholarships.status` |
| `AttemptStatus` | `DRAFT`, `RUNNING`, `RESULT_READY`, `COMPLETED` | `attempts.status` |
| `PlanStatus` | `DRAFT`, `ACTIVE`, `REVIEWED`, `ARCHIVED` | `plans.status` |
| `TaskStatus` | `TODO`, `DOING`, `DONE`, `SKIPPED` | `tasks.status` |

Enum disimpan dengan nama value apa adanya (tanpa `@map` ke huruf kecil).
Perilaku ini sengaja mengikuti Prisma 7 yang sudah kembali seperti Prisma 6.

### 2.2 Enum TypeScript-only

Enum berikut **tidak** ada di database karena hanya hidup di dalam kolom JSON.
Didefinisikan sebagai union type di TypeScript pada masing-masing module:

| Enum | Nilai |
|---|---|
| `Role` | `STUDENT`, `DEMO`, `CURATOR` |
| `InterestDimension` | `LOGIC_SYSTEM`, `PROCESS_DATA`, `VISUAL_COMM`, `EXPLORATION_COLLAB` |
| `AnswerState` | `ANSWERED`, `UNKNOWN`, `SKIPPED` |
| `AcademicReadinessStatus` | `READY`, `PARTIAL`, `INCOMPLETE` |
| `CostFeasibilityStatus` | `WITHIN_BUDGET`, `DEPENDS_ON_SCENARIO`, `NEEDS_FINANCIAL_AID`, `INSUFFICIENT_DATA` |
| `DifficultyLevel` | `EASY`, `MEDIUM`, `HARD` |
| `ObstacleType` | `MATERIAL_UNFAMILIAR`, `TOOL_DIFFICULTY`, `TIME_CONSTRAINT`, `OTHER` |
| `ExpectationChange` | `MATCHED`, `CHANGED`, `UNKNOWN` |
| `NextInterestAction` | `RETRY_MISSION`, `TRY_OTHER_MAJOR`, `DISCUSS_FIRST` |

---

## 3. Zona Katalog Publik

Hanya baris ber-`publication_status = 'PUBLISHED'` yang boleh diekspos lewat
`GET /api/catalog`. Semua fakta kampus wajib punya relasi ke `sources`
(DOMAIN-CONTEXT §5 batasan #4).

### 3.1 `sources`

Sumber resmi: URL, penerbit, tahun berlaku, dan tanggal verifikasi.

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `url` | `text` | |
| `publisher` | `varchar(160)` | |
| `title` | `varchar(240)` | |
| `applicable_year` | `int` | tahun berlaku sumber |
| `checked_at` | `timestamptz(6)` | tanggal verifikasi terakhir |
| `review_status` | `varchar(40)` | |
| `created_at` | `timestamptz(6)` | default now |

Index: `publisher`.

### 3.2 `majors`

Rumpun jurusan. MVP: `INF`, `IND`, `DKV`.

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(40)` | PK |
| `name` | `varchar(120)` | |
| `summary` | `text` | |
| `heuristic_weights_json` | `json` | bobot `heuristic-v1` per `InterestDimension` |
| `prep_subjects_json` | `json` | mapelpeehan yang relevan |
| `publication_status` | `PublicationStatus` | default `DRAFT` |
| `created_at` / `updated_at` | `timestamptz(6)` | |

### 3.3 `universities`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(40)` | PK |
| `name` | `varchar(160)` | |
| `city_code` | `varchar(40)` | mis. `ID-JT-74` |
| `province_code` | `varchar(40)` | mis. `ID-JT` |
| `official_website` | `text` | |

### 3.4 `programs`

Pasangan prodi-kampus. `is_pinned` **tidak** ada di sini — pin disimpan di
`profiles.pinned_programs_json` (AC-03F / AC-05C).

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(80)` | PK, mis. `ugm-inf-s1` |
| `major_id` | `varchar(40)` | FK → `majors.id`, `RESTRICT` |
| `university_id` | `varchar(40)` | FK → `universities.id`, `RESTRICT` |
| `name` | `varchar(200)` | |
| `campus_location` | `varchar(160)` | |
| `degree` | `varchar(60)` | |
| `admission_paths_json` | `json` | |
| `source_id` | `uuid` | FK → `sources.id`, `RESTRICT`, **wajib** |
| `publication_status` | `PublicationStatus` | default `DRAFT` |

Index: `(major_id, publication_status)`, `university_id`.

### 3.5 `cost_profiles`

Rincian biaya per prodi + tahun + jalur masuk + mode tinggal.

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `program_id` | `varchar(80)` | FK → `programs.id`, `CASCADE` |
| `academic_year` | `int` | |
| `admission_track` | `varchar(60)` | |
| `housing_mode` | `HousingMode` | |
| `version` | `varchar(40)` | |
| `components_json` | `json` | lihat §3.5.1 |
| `source_id` | `uuid` | FK → `sources.id`, `RESTRICT` |

**Unique:** `(program_id, academic_year, admission_track, housing_mode, version)`

#### 3.5.1 Struktur `components_json`

```jsonc
{
  "tuitionPerSemester":      { "min": 9000000, "max": 9000000 },
  "livingCostMonthly":       { "min": null,     "max": null     },
  "recurringSupportMonthly": { "min": 500000,  "max": 900000  },
  "upfrontCost":             { "min": 2000000, "max": 2000000 }
}
```

Aturan main (BUSINESS-RULES R3):

```
MonthlyEquivalent = tuitionPerSemester / 6 + livingCostMonthly + recurringSupportMonthly
```

- Rumus di ataswfork pada nilai **masing-masing batas**: `MonthlyEquivalent_min`
  memakai nilai `min`, `MonthlyEquivalent_max` memakai nilai `max`.
- Pembagi `6` berasal dari `SEMESTER_MONTHS_DEFAULT`.
- `INSUFFICIENT_DATA` bila `monthlyBudgetMax` null **atau** `tuitionPerSemester`
  null **atau** `livingCostMonthly` null.
- Nilai `null` **wajib** disimpan sebagai `null`. Melemetrykan `null` menjadi `0`
  menghasilkan status `WITHIN_BUDGET` yang menyesatkan — pelanggaran AC-03B/R10.

### 3.6 `curricula`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `program_id` | `varchar(80)` | FK → `programs.id`, `CASCADE` |
| `curriculum_year` | `int` | kurikulum dari tahun lama → tampilkan `STALE` (T11) |
| `version` | `varchar(40)` | |
| `rules_json` | `json` | |
| `source_id` | `uuid` | FK → `sources.id`, `RESTRICT` |

**Unique:** `(program_id, curriculum_year, version)`

### 3.7 `scholarships`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(80)` | PK |
| `name` | `varchar(200)` | |
| `organizer` | `varchar(160)` | |
| `aid_type` | `varchar(60)` | |
| `scope_json` | `json` | prodi/jurusan yang tercakup |
| `benefits_json` | `json` | nominal & jenis bantuan |
| `dates_json` | `json` | tanggal buka/tutup |
| `status` | `ScholarshipStatus` | default `UNKNOWN`; closing date lewat → `CLOSED` (T11) |
| `source_id` | `uuid` | FK → `sources.id`, `RESTRICT` |

### 3.8 `missions`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(80)` | PK |
| `mission_version` | `varchar(40)` | |
| `engine_version` | `varchar(40)` | versi runner deterministik |
| `major_id` | `varchar(40)` | FK → `majors.id`, `RESTRICT` |
| `title` | `varchar(200)` | |
| `config_json` | `json` | graph (INF), parameter DES (IND), atau struktur menu (DKV) |
| `reviewer_name` | `varchar(120)` | |
| `publication_status` | `PublicationStatus` | default `DRAFT` |

### 3.9 `careers` · `skills` · `career_majors` · `career_skills`

Relasi many-to-many memakai **tabel penghubung eksplisit** (ERD DoD).

**`careers`**

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(80)` | PK |
| `title` | `varchar(160)` | |
| `summary` | `text` | |
| `activities_json` | `json` | contoh aktivitas kerja |
| `reviewed_by` | `varchar(120)` | |
| `source_ids_json` | `json` | array `source_id` |
| `publication_status` | `PublicationStatus` | default `DRAFT` |

**`skills`**

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `varchar(80)` | PK |
| `name` | `varchar(120)` | |
| `description` | `text` | |

**`career_majors`** — PK komposit `(career_id, major_id)`, plus `mapping_reason`.

**`career_skills`** — PK komposit `(career_id, skill_id)`.

Kedua junction memakai `CASCADE` ke induknya.

---

## 4. Zona Data Privat Siswa

### 4.1 `profiles` — akar kepemilikan

PK adalah `user_id` (uuid) langsung, **tanpa** kolom `id` surrogate. Nilainya
diambil dari claim `sub` pada JWT Supabase, bukan dari tabel `auth.users`
(lihat catatan di §5).

| Kolom | Tipe | Constraint | Catatan |
|---|---|---|---|
| `user_id` | `uuid` | PK | |
| `display_name` | `varchar(120)` | nullable | |
| `grade_level` | `GradeLevel` | nullable | |
| `graduation_year` | `int` | nullable | |
| `city_code` | `varchar(40)` | nullable | `null` = belum diisi |
| `province_code` | `varchar(40)` | nullable | |
| `relocation_mode` | `RelocationMode` | nullable | |
| `preferred_regions_json` | `json` | nullable | maks. 10 |
| `preferred_majors_json` | `json` | nullable | maks. 5 |
| `monthly_budget_min` | `int` | nullable | Rupiah penuh |
| `monthly_budget_max` | `int` | nullable | **h sumber kebenaran status biaya** |
| `upfront_budget_max` | `int` | nullable | dievaluasi terpisah (R3) |
| `housing_mode` | `HousingMode` | nullable | |
| `pinned_programs_json` | `json` | nullable | maks. 3, selalu dipertahankan |
| `version` | `int` | default 1 | optimistic lock |
| `created_at` / `updated_at` | `timestamptz(6)` | | |

Invarian yang ditegakkan service: `monthly_budget_min <= monthly_budget_max`
bila keduanya tidak null.

### 4.2 `consents`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `purpose_version` | `varchar(40)` | mis. `consent-v1` |
| `is_accepted` | `bool` | |
| `consented_at` | `timestamptz(6)` | |

Index: `user_id`.

### 4.3 `academic_records`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `subject` | `varchar(100)` | |
| `semester` | `int` | 1–6 |
| `score` | `float` | 0–100 |
| `scale` | `varchar(20)` | default `0-100` |

**Unique:** `(user_id, subject, semester)` — mencegah nilai dobel saat autosave.

### 4.4 `interest_submissions`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `instrument_version` | `varchar(40)` | `INSTRUMENT_VERSION` = `v0.1` |
| `answers_json` | `json` | 12 butir |
| `submitted_at` | `timestamptz(6)` | |

Struktur `answers_json`:

```jsonc
[
  { "itemId": "q1",  "dimension": "LOGIC_SYSTEM", "value": 5,    "state": "ANSWERED" },
  { "itemId": "q2",  "dimension": "LOGIC_SYSTEM", "value": 4,    "state": "ANSWERED" },
  { "itemId": "q3",  "dimension": "LOGIC_SYSTEM", "value": null, "state": "UNKNOWN"  }
]
```

Immutable — setiap submit adalah baris baru, baris lama tidak pernah diubah.
`value: null` berarti `UNKNOWN`/`SKIPPED` dan **dilarang** dihitung sebagai `0`.

Index: `(user_id, submitted_at)`.

### 4.5 `recommendation_runs`

Snapshot immutable hasil satu eksekusi mesin rekomendasi.

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `profile_version` | `int` | versi profil saat run dibuat |
| `rule_version` | `varchar(40)` | `heuristic-v1` |
| `catalog_version` | `varchar(40)` | |
| `inputs_snapshot_json` | `json` | menjamin reproducibility (T03) |
| `results_json` | `json` | |
| `created_at` | `timestamptz(6)` | |

Index: `(user_id, created_at)`. Kolom `admissionProbability` **tidak ada** dan
selalu `null` di payload (DOMAIN-CONTEXT §5 batasan #2).

### 4.6 `attempts`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `mission_id` | `varchar(80)` | FK → `missions.id`, `RESTRICT` |
| `mission_version` | `varchar(40)` | |
| `seed` | `varchar(64)` | seed runner deterministik |
| `status` | `AttemptStatus` | default `DRAFT` |
| `artifact_json` | `json` | nullable; draft yang di-autosave |
| `result_json` | `json` | nullable; hasil runner |
| `revision` | `int` | default 0; naik tiap autosave |
| `last_run_revision` | `int` | nullable; revisi terakhir yang di-run |
| `idempotency_key` | `varchar(120)` | **wajib** |
| `created_at` / `updated_at` | `timestamptz(6)` | |

**Unique:** `(user_id, idempotency_key)`

Index: `(user_id, created_at)`.

### 4.7 `reflections`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `attempt_id` | `uuid` | FK → `attempts.id`, `CASCADE` |
| `revision` | `int` | |
| `responses_json` | `json` | `{ enjoyment, continueInterest, difficulty, obstacle, ... }` |
| `is_active` | `bool` | default false; satu refleksi aktif per attempt |
| `created_at` | `timestamptz(6)` | |

**Unique:** `(attempt_id, revision)` · Index: `(user_id, is_active)`

`continueInterest` bernilai `null` → `F(j)` tidak dihitung dan `R(j) = I(j)`,
bukan `F(j) = 0` (R2).

### 4.8 `shortlists`

| Kolom | Tipe | Constraint |
|---|---|---|
| `user_id` | `uuid` | PK + FK → `profiles.user_id`, `CASCADE` |
| `program_ids_json` | `json` | array, **maks. 3** (`MAX_SHORTLIST_PROGRAMS`) |
| `base_version` | `int` | versi profil dasar |
| `updated_at` | `timestamptz(6)` | |

Hubungan 1-1 dengan profil, jadi `profiles.shortlist` bersifat tunggal.

### 4.9 `scenarios`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `base_profile_version` | `int` | |
| `overrides_json` | `json` | |
| `results_json` | `json` | |
| `created_at` | `timestamptz(6)` | |

Tabel ini **tidak pernah** menulis balik ke `profiles`. Skenario what-if bersifat
transien (AC-06B / T10).

### 4.10 `plans`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `goal_ids_json` | `json` | boleh kosong (AC-08C) |
| `weekly_minutes` | `int` | |
| `start_date` | `date` | hari ke-0 dari rentang 30 hari |
| `version` | `int` | default 1 |
| `status` | `PlanStatus` | default `DRAFT` |
| `idempotency_key` | `varchar(120)` | **wajib** |
| `created_at` / `updated_at` | `timestamptz(6)` | |

**Unique:** `(user_id, idempotency_key)` · Index: `(user_id, status)`

Aktivasi rencana + pembuatan task-nya wajib satu `prisma.$transaction`.

### 4.11 `tasks`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `plan_id` | `uuid` | FK → `plans.id`, `CASCADE` |
| `prerequisite_task_id` | `uuid` | nullable, self-FK, `SET NULL` |
| `title` | `varchar(200)` | |
| `action_type` | `varchar(60)` | |
| `estimated_minutes` | `int` | |
| `due_date` | `date` | dalam rentang 30 hari |
| `status` | `TaskStatus` | default `TODO` |
| `evidence_note` | `text` | nullable |
| `evidence_url` | `text` | nullable |
| `source_id` | `uuid` | nullable, FK → `sources.id`, `SET NULL` |
| `version` | `int` | default 1 |
| `created_at` / `updated_at` | `timestamptz(6)` | |

Index: `plan_id`, `prerequisite_task_id`.

**Validasi prerequisite (wajib di layer service, R8):**
1. `prerequisite_task_id` harus menunjuk task di `plan` yang sama
2. Graf `prerequisite` tidak boleh membentuk siklus

**Revisi rencana (AC-08E / T13):** mengubah `goal_ids` membuat baris `plans` baru
ber-`version` berikutnya. Task berstatus `DONE` **tidak** dihapus.

### 4.12 `passports`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → `profiles.user_id`, `CASCADE` |
| `snapshot_json` | `json` | immutable |
| `redactions_json` | `json` | daftar field yang disensor |
| `created_at` | `timestamptz(6)` | |

Kolom dinamai `owner_id` (bukan `user_id`) mengikuti `docs/erd.md` §2.

**Redaction adalah penghapusan, bukan penyembunyian (R9 / AC-09B / T14).** Field
yang tidak ada di `includeFields` harus benar-benar tidak ada di `snapshot_json`
yang disimpan **dan** yang dikirim ke browser — termasuk `academicRecords`,
`budget`, dan `privateReflectionNotes`.

### 4.13 `audit_logs`

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | **nullable, tanpa FK** |
| `event_name` | `varchar(120)` | |
| `request_id` | `varchar(80)` | nullable |
| `metadata_json` | `json` | nullable |
| `created_at` | `timestamptz(6)` | |

Index: `(user_id, created_at)`, `(event_name, created_at)`.

`user_id` sengaja tanpa FK agar event tetap tercatat meski profil belum ada
(gagal login, health probe) atau sudah terhapus.

**Larangan isi `metadata_json`:** token, nilai rapor, nominal anggaran, dan teks
refleksi tidak boleh masuk (ARCHITECTURE §3 butir 8).

---

## 5. Keputusan desain

### 5.1 Mengapa tidak ada FK ke `auth.users`

Tabel autentikasi Supabase berada di schema `auth`, terpisah dari schema `public`
yang dipakai aplikasi. Prisma memerlukan fitur preview `multiSchema` plus grant
tambahan untuk membuat FK lintas schema, serta Memberi beban operasional tambahan.

Sebagai gantinya, `profiles.user_id` menyimpan uuid polos hasil verifikasi JWT.
Ownership ditegakkan di **lapisan aplikasi**: setiap query ke tabel privat wajib
memakai `where: { userId }` dari `@CurrentUser()`, bukan dari parameter request
(ARCHITECTURE §3 butir 7, ARCHITECTURE §5.3).

Konsekuensi yang harus diterima: database **tidak** yang memastikan userId valid.
Deteksi akun yang tidak sengaja terhapus ditangani di repository (cek jumlah baris
yang terpengaruh), bukan oleh constraint database.

### 5.2 Mengapa komponen biaya disimpan sebagai JSON

Nilai biaya bersifat heterogen (ada `min`/`max`, ada komponen berdenyatta `null`),
dan bentuknya berubah saat kurikulum baru ditambahkan. Menyimpan sebagai JSON
menghindari migrasi skema berkali-kali.Seluruh perhitungan biaya dihitung di
`comparisons/cost.calculator.ts` dari objek JSON, bukan lewat kolom terpisah.

### 5.3 Mengapa `AuditLog` tidak punya FK

Sudah dijelaskan di §4.13.

---

## 6. Peta tabel ke module NestJS

| Module `src/` | Tabel yang diakses |
|---|---|
| `infra/prisma` | `PrismaClient`, adapter, transaksi |
| `auth` | `profiles` (cek akun), `consents` |
| `profile` | `profiles`, `academic_records`, `consents` |
| `interests` | `interest_submissions` |
| `catalog` | `majors`, `universities`, `programs`, `cost_profiles`, `curricula`, `scholarships`, `missions`, `careers`, `skills`, `career_majors`, `career_skills`, `sources` |
| `recommendations` | `recommendation_runs`, `interest_submissions`, `academic_records`, `reflections` |
| `simulations` | `attempts`, `missions` |
| `reflections` | `reflections`, `attempts` |
| `comparisons` | `shortlists`, `scenarios`, `cost_profiles` |
| `careers` | `careers`, `skills`, `career_majors`, `career_skills` |
| `plans` | `plans`, `tasks` |
| `passports` | `passports` + snapshot dari `profile`/`recommendations`/`simulations`/`comparisons`/`plans` |
| `audit` | `audit_logs` |

---

## 7. Definition of Done Database

- [ ] Seluruh 25 tabel di `prisma/schema.prisma` sesuai dengan dokumen ini
- [ ] Semua tabel privat punya FK `CASCADE` ke `profiles.user_id`
- [ ] Constraint unik `(user_id, idempotency_key)` dan `(user_id, subject, semester)` aktif
- [ ] Semua fakta kampus (`programs`, `cost_profiles`, `curricula`, `scholarships`) terhubung ke `sources`
- [ ] Tidak ada kolom PII sensitif
- [ ] `*.repository.integration-spec.ts` lulus terhadap PostgreSQL test nyata tanpa mock DB