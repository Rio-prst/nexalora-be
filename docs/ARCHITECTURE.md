# Nexalora — Architecture

- **Dokumen:** Architecture Decision & Development Guide
- **Versi:** 1.1
- **Status:** Baseline untuk validasi tim
- **Basis produk:** PRD Nexalora v1.0 (13 Oktober 2026)

## 1. Tujuan

Dokumen ini menetapkan struktur backend, batas tanggung jawab setiap layer di dalam module, aturan dependensi, validasi Zod, keamanan, strategi pengujian (unit test dan repository integration test ke DB nyata), serta dokumentasi API untuk **Nexalora**[cite: 7].

Nexalora membantu siswa SMA kelas XI–XII mengeksplorasi pilihan studi dan karier melalui profil diri, simulasi pengalaman belajar lintas jurusan, perbandingan prodi-kampus dengan skenario biaya/lokasi, serta rencana tindakan 30 hari. Hasil rekomendasi adalah **alasan eksplorasi yang transparan**, bukan diagnosis bakat atau prediksi kelulusan kampus.

## 2. Stack yang diusulkan

| Area | Teknologi |
|---|---|
| Backend | NestJS, TypeScript (Strict Mode), REST[cite: 7] |
| Validasi input | Zod (`ZodValidationPipe`)[cite: 7] |
| Database | PostgreSQL (Supabase Cloud)[cite: 7] |
| ORM dan migrasi | Prisma[cite: 7] |
| Unit test | Jest[cite: 7] |
| HTTP/API integration test | Supertest[cite: 7] |
| Dokumentasi API | Swagger / OpenAPI melalui `@nestjs/swagger`[cite: 7] |
| Repository | Single-app NestJS (backend only, terpisah dari repo frontend)[cite: 7] |

**Catatan implementasi:** Proyek ini memilih Zod (bukan `class-validator`) untuk memvalidasi seluruh input HTTP secara konsisten sebelum mencapai layer service[cite: 7].

## 3. Prinsip arsitektur

1. **Modular monolith berbasis module langsung di `src/`:** Setiap kapabilitas produk dipisah menjadi module NestJS langsung di bawah `src/<module-name>/` tanpa memisahkan folder `src/domain/` tersendiri[cite: 7].
2. **Dependency direction:** `route/controller → service → repository → database`[cite: 7]. Service bergantung pada kontrak interface repository (`I<Entity>Repository`), bukan implementasi Prisma secara langsung[cite: 7].
3. **DTO di batas sistem (`dto/`):** Semua payload (`create`, `update`, `run`), query, dan parameter yang berasal dari HTTP divalidasi dengan Zod di dalam folder `dto/` masing-masing module[cite: 7].
4. **Kontrak eksplisit (`interfaces/`):** Setiap module menyediakan kontrak `*.repository.interface.ts` dan `*.service.interface.ts` beserta simbol Dependency Injection (`Symbol`)[cite: 7].
5. **Business rules & engine murni di dalam module:** Controller tidak menjalankan aturan bisnis dan repository tidak menentukan keputusan bisnis[cite: 7]. Perhitungan deterministik (rekomendasi, biaya, simulasi, planner) berada di dalam service/engine module terkait dan wajib memiliki unit test (`*.spec.ts`) tanpa akses DB[cite: 7].
6. **Transaksi untuk alur kritis:** Pembaruan profil+nilai, eksekusi simulasi, serta pembuatan rencana 30 hari beserta tugasnya harus berjalan secara transaksional (`prisma.$transaction`)[cite: 7].
7. **Strict ownership & privacy by default:** Semua tabel privat difilter menggunakan `userId` pemilik dari token autentikasi. Tidak menyimpan NIK, NISN, alamat rumah rinci, atau dokumen rapor/keuangan.
8. **Auditability & fire-and-forget logging:** Peristiwa produk dicatat melalui module `audit` tanpa memblokir respons utama dan tanpa mencatat token, nilai rapor, anggaran, atau teks refleksi.
9. **Fail safely:** Jika nilai rapor atau komponen biaya belum diketahui (`null`), sistem mengembalikan status `PARTIAL` / `INSUFFICIENT_DATA`, bukan menganggapnya bernilai `0`[cite: 7].
10. **No predictive/diagnostic claims:** API tidak mengeluarkan persentase kecocokan psikologis atau probabilitas lolos seleksi kampus (`admissionProbability` selalu `null`).

## 4. Struktur direktori

Seluruh module fitur berada langsung di bawah `src/`:

```text
.
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/                  # cross-cutting generik
│   │   ├── types/               # tipe bersama, mis. AuthenticatedUser
│   │   ├── decorators/          # @Public, @Roles, @CurrentUser, @IdempotencyKey
│   │   ├── guards/              # JwtAuthGuard (Supabase), RolesGuard
│   │   ├── errors/
│   │   ├── filters/             # GlobalExceptionFilter
│   │   ├── interceptors/
│   │   └── pipes/               # ZodValidationPipe
│   ├── infra/                   # integrasi eksternal
│   │   └── prisma/              # PrismaModule & PrismaService
│   ├── auth/                    # verifikasi token Supabase, sesi, mode demo
│   ├── profile/                 # F01: profil siswa, akademik, consent, hapus data
│   ├── interests/               # F02: instrumen 12 butir minat
│   ├── catalog/                 # F07 & F10: jurusan, prodi-kampus, biaya, kurikulum, beasiswa, sumber
│   ├── recommendations/         # F03: perhitungan relevansi I(j), R(j), kelayakan biaya, snapshot run
│   ├── simulations/             # F04: misi kantin (INF, IND, DKV), attempt, runner deterministik
│   ├── reflections/             # F05: form refleksi pasca-misi & pratinjau perubahan urutan
│   ├── comparisons/             # F06: shortlist max 3 prodi & uji skenario what-if
│   ├── careers/                 # F08A: katalog peran karier, aktivitas, dan pemetaan skill/jurusan
│   ├── plans/                   # F08B: generator rencana 30 hari & manajemen task
│   ├── passports/               # F09: snapshot paspor & server-side redaction
│   ├── audit/                   # pencatatan event produk & audit log ke DB
│   └── health/                  # endpoint health check tanpa akses DB
├── test/
│   └── e2e/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── business-rules.md
│   ├── database.md
│   ├── domain-context.md
│   ├── erd.md
│   ├── prd.md
│   └── tasks.md
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── .prettierrc
├── .env.example
└── README.md
```

### Struktur standar di dalam setiap module (`src/<module-name>/`)

Setiap module mengikuti pola folder dan penamaan file berikut secara konsisten[cite: 7]:

```text
src/<module-name>/
├── dto/
│   ├── create-<entity>.dto.ts
│   ├── update-<entity>.dto.ts
│   ├── list-<entity>.query.dto.ts
│   └── <entity>.response.dto.ts
├── interfaces/
│   ├── <entity>.repository.interface.ts   # kontrak persistence + simbol DI token
│   └── <entity>.service.interface.ts      # kontrak use case/service + simbol DI token
├── <entity>.repository.ts
├── <entity>.repository.spec.ts            # unit test mapping/helper repo (bila ada logika murni)
├── <entity>.repository.integration-spec.ts # WAJIB: integration test langsung ke DB test nyata
├── <entity>.service.ts
├── <entity>.service.spec.ts               # WAJIB: unit test business rules & use case (repo di-mock)
├── <entity>.controller.ts
├── <entity>.controller.spec.ts            # WAJIB: unit test HTTP adapter & DTO mapping (service di-mock)
├── <entity>.routes.ts
└── <entity>.module.ts
```

> **Catatan khusus untuk module dengan perhitungan kompleks (`recommendations`, `simulations`, `comparisons`, `plans`):**  
> Helper kalkulasi murni (seperti `recommendation.calculator.ts`, `inf-mission.runner.ts`, `ind-mission.runner.ts`, `dkv-mission.checker.ts`, `cost.calculator.ts`, `plan-template.generator.ts`) diletakkan **langsung di dalam folder module masing-masing** berdampingan dengan file unit test-nya (`*.spec.ts`), lalu dipanggil oleh `<entity>.service.ts`.

Berkas test diletakkan **sejajar** dengan berkas yang diuji, bukan di dalam folder `__tests__/`[cite: 7].

### Konvensi nama kontrak dan token DI

Kontrak yang diimplementasikan oleh class memakai prefiks `I`. Class implementasinya memakai nama yang sama tanpa prefiks `I` dan tanpa sufiks `Impl`[cite: 7]:

```ts
// src/profile/interfaces/profile.repository.interface.ts
export interface IProfileRepository {
  findByUserId(userId: string): Promise<ProfileRecord null |>;
  upsertWithVersion(userId: string, input: UpdateProfileInput): Promise<ProfileRecord>;
  deleteAccountData(userId: string): Promise<void>;
}

export const IProfileRepository = Symbol('IProfileRepository');

// src/profile/profile.repository.ts
@Injectable()
export class ProfileRepository implements IProfileRepository { ... }
```

Service menginjeksi repository menggunakan token simbol dari kontraknya[cite: 7]:

```ts
@Inject(IProfileRepository) private readonly repository: IProfileRepository,
```

Tipe data pendukung dan DTO **tidak** memakai prefiks `I` (misalnya `ProfileRecord`, `UpdateProfileDto`, `RecommendationResult`)[cite: 7].

File `<entity>.routes.ts` hanya berisi **konstanta path** yang dipakai oleh decorator controller (`@Controller(PROFILE_ROUTES.base)`), bukan sistem routing kedua[cite: 7].

`JwtAuthGuard` dan `RolesGuard` di `src/common/guards/` didaftarkan secara global melalui `APP_GUARD`, sehingga seluruh endpoint terlindungi secara default kecuali ditandai `@Public()`[cite: 7].

## 5. Tanggung jawab setiap layer di dalam module

### 5.1 `dto/` — input/output validation schema (Zod)

- Definisikan schema Zod untuk request body (`create`, `update`, `run`), path params (`:id`), query params (`filter`, `pagination`), dan response DTO bila diperlukan[cite: 7].
- Validasi tipe data, format UUID/tanggal, enum, batas angka (misal skor `0..100`, skala minat `1..5`), panjang teks, dan struktur JSON artefak simulasi[cite: 7].
- Skema `create` dan `update` wajib dipisah; skema `update` (`PATCH`) wajib menyertakan `expectedVersion` / `expectedRevision` (bila entitas berversi) dan menolak objek kosong[cite: 7].
- DTO tidak boleh mengakses database dan tidak boleh menjalankan alur bisnis[cite: 7].

Contoh `src/profile/dto/update-profile.dto.ts`:

```ts
import { z } from 'zod';

export const AcademicSubjectInputSchema = z.object({
  subject: z.string().min(1).max(100),
  semester: z.number().int().min(1).max(6),
  score: z.number().min(0).max(100),
  scale: z.literal('0-100').default('0-100'),
});

export const UpdateProfileSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    consent: z
      .object({
        purposeVersion: z.string().min(1).max(40),
        isAccepted: z.boolean(),
      })
      .optional(),
    displayName: z.string().min(1).max(120).optional(),
    gradeLevel: z.enum(['XI', 'XII', 'OTHER']).optional(),
    graduationYear: z.number().int().min(2025).max(2035).optional(),
    cityCode: z.string().max(40).nullable().optional(),
    provinceCode: z.string().max(40).nullable().optional(),
    relocationMode: z.enum(['STAY', 'OPEN', 'SELECTED']).optional(),
    preferredRegions: z.array(z.string().max(40)).max(10).optional(),
    monthlyBudgetMin: z.number().int().nonnegative().nullable().optional(),
    monthlyBudgetMax: z.number().int().nonnegative().nullable().optional(),
    upfrontBudgetMax: z.number().int().nonnegative().nullable().optional(),
    housingMode: z.enum(['FAMILY', 'RENT', 'UNKNOWN']).optional(),
    preferredMajors: z.array(z.string().max(40)).max(5).optional(),
    pinnedPrograms: z.array(z.string().max(80)).max(3).optional(),
    schoolSubjects: z.array(AcademicSubjectInputSchema).max(60).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.monthlyBudgetMin == null ||
      data.monthlyBudgetMax == null ||
      data.monthlyBudgetMin <= data.monthlyBudgetMax,
    {
      message: 'monthlyBudgetMin tidak boleh melebihi monthlyBudgetMax',
      path: ['monthlyBudgetMin'],
    },
  );

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
```

Contoh `ZodValidationPipe` di `src/common/pipes/zod-validation.pipe.ts`[cite: 7]:

```ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Input tidak valid',
        details: result.error.flatten(),
      });
    }
    return result.data;
  }
}
```

### 5.2 `interfaces/` — repository & service contracts

- `<entity>.repository.interface.ts`: mendefinisikan operasi baca/tulis/transaksi database yang dibutuhkan oleh service[cite: 7].
- `<entity>.service.interface.ts`: mendefinisikan operasi use case yang dipanggil oleh controller atau module lain[cite: 7].
- Hanya berisi signature method dan tipe domain/DTO; tidak boleh mengimpor model internal Prisma (`@prisma/client`) ke luar batas repository bila tidak diperlukan[cite: 7].

### 5.3 `<entity>.repository.ts` — persistence layer

- Satu-satunya layer di dalam module yang menjalankan query ke PostgreSQL melalui `PrismaService`[cite: 7].
- Memetakan baris database Prisma ke tipe record yang didefinisikan pada `interfaces/`[cite: 7].
- Menegakkan isolasi pemilik (`where: { userId }`), optimistic locking (`where: { id, version: expectedVersion }`), serta transaksi atomik (`prisma.$transaction`)[cite: 7].
- Tidak boleh melempar HTTP exception spesifik framework (kecuali error persistence/optimistic lock yang diterjemahkan service) dan tidak boleh menghitung rumus bisnis[cite: 7].

### 5.4 `<entity>.service.ts` — use cases, business rules & runners

- Menjalankan seluruh logika bisnis, validasi lintas-entitas, pengecekan kepemilikan resource, orkestrasi transaksi, dan pemanggilan fungsi kalkulasi/runner deterministik[cite: 7].
- Menghasilkan objek domain murni, bukan objek Express `res`[cite: 7].
- Menjadwalkan pencatatan `audit` secara non-blocking setelah transaksi database selesai[cite: 7].

### 5.5 `<entity>.controller.ts` — HTTP adapter

- Menerima request HTTP, menjalankan `ZodValidationPipe`, mengambil identitas pengguna dari `@CurrentUser()`, memanggil `I<Entity>Service`, dan membungkus response dalam envelope `{ data, meta: { requestId } }`[cite: 7].
- Mendeklarasikan dokumentasi Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`)[cite: 7].

## 6. Daftar Module dan Batas Tanggung Jawab

| Module (`src/`) | Tanggung jawab utama |
|---|---|
| `auth` | Verifikasi JWT Supabase, ekstraksi `userId` & `role`, penanganan sesi mode demo sintetis (`F01`). |
| `profile` | CRUD profil siswa, catatan nilai akademik per semester, pencatatan persetujuan (`consents`), konflik versi `409`, dan penghapusan seluruh data akun (`F01`, `NFR-04`). |
| `interests` | Penyimpanan immutable 12 butir pertanyaan aktivitas minat dan perhitungan kecukupan dimensi (`F02`). |
| `catalog` | Pembacaan publik katalog jurusan, prodi-kampus, profil biaya, kurikulum resmi, beasiswa, dan validasi kesegaran sumber (`F07`, `F10`). |
| `recommendations` | Kalkulator relevansi minat $I(j)$, penggabungan refleksi $R(j)$, evaluasi kelayakan biaya/akademik, dan penyimpanan snapshot `recommendation_runs` (`F03`). |
| `simulations` | Pengelolaan `attempts` (idempotent), *autosave* artefak dengan `expectedRevision`, serta eksekusi runner deterministik misi Informatika (`INF`), Teknik Industri (`IND`), dan DKV (`F04`). |
| `reflections` | Penyimpanan refleksi pasca-misi berversi dan pembuatan pratinjau perubahan urutan rekomendasi tanpa penalti hint/waktu (`F05`). |
| `comparisons` | Penyimpanan maksimal 3 prodi di `shortlists` dan simulasi skenario *what-if* (`scenarios`) tanpa mengubah profil permanen (`F06`). |
| `careers` | Penyajian kartu peran karier, contoh aktivitas, dan relasi *many-to-many* ke jurusan serta *skill* (`F08`). |
| `plans` | Generator deterministik pratinjau rencana 30 hari, aktivasi rencana beserta `tasks` dalam satu transaksi, dan pembaruan status/bukti tugas (`F08`). |
| `passports` | Pembuatan snapshot Paspor Studi & Karier yang *immutable* dengan penyensoran (*server-side redaction*) atas field sensitif yang tidak dicentang (`F09`). |
| `audit` | Pencatatan peristiwa produk (*analytics funnel*) dan audit keamanan ke tabel `audit_logs` tanpa menyimpan data sensitif. |
| `health` | Endpoint `/api/health` untuk pemeriksaan status hidup aplikasi tanpa query database berat[cite: 7]. |

## 7. Strategi Testing Wajib

Setiap file yang memiliki logika atau akses data wajib memiliki pengujian yang sesuai dengan perannya[cite: 7]:

### 7.1 Unit Test Service & Engine (`<entity>.service.spec.ts` / `*.spec.ts`)

- **Lokasi:** Sejajar dengan file service/helper di dalam `src/<module>/`[cite: 7].
- **Cara jalan:** `pnpm test` (Jest)[cite: 7].
- **Aturan:** Mock seluruh `I<Entity>Repository` dan dependensi eksternal menggunakan `jest.fn()`[cite: 7]. Jangan pernah menyentuh database di dalam unit test.
- **Yang wajib diuji:**
  - Rumus rekomendasi $I(j)$, $F(j)$, $R(j)$ dan penanganan jawaban `UNKNOWN` (`T02`, `T03`).
  - Rumus biaya bulanan ekuivalen dan status `INSUFFICIENT_DATA` saat komponen `null` (`T04`, `T05`).
  - Runner simulasi Informatika (`INF-01`..`INF-04` termasuk pencegahan *infinite loop* `T06`), golden fixture antrean Teknik Industri (`[2,1,1]` menghasilkan 9 selesai di 600s `T07`), dan checklist teknis DKV (`T08`).
  - Ketahanan minat terhadap pemakaian *hint* dan durasi pengerjaan (`T09`).
  - Isolasi skenario *what-if* (`T10`), generator rencana 30 hari tanpa karier terpilih (`T12`), preservasi tugas `DONE` saat revisi rencana (`T13`), dan *redaction* paspor (`T14`).
  - Penolakan akses lintas pemilik (`403`/`404` `T01`) dan pemetaan konflik versi (`409` `T15`).

### 7.2 Unit Test Controller (`<entity>.controller.spec.ts`)

- **Lokasi:** Sejajar dengan file controller di dalam `src/<module>/`[cite: 7].
- **Aturan:** Mock `I<Entity>Service`[cite: 7].
- **Yang wajib diuji:**
  - Pemetaan parameter path, query, body, header `Idempotency-Key`, dan `@CurrentUser()` ke method service yang tepat[cite: 7].
  - Validasi `ZodValidationPipe` menolak payload rusak dengan `400 VALIDATION_ERROR`[cite: 7].
  - Bentuk response sukses (`{ data, meta }`) dan HTTP status code (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`)[cite: 7].

### 7.3 Repository Integration Test (`<entity>.repository.integration-spec.ts`)

- **Lokasi:** Sejajar dengan `<entity>.repository.ts` di dalam `src/<module>/`[cite: 7].
- **Cara jalan:** `pnpm test:integration` menggunakan koneksi `DATABASE_URL_TEST` (menunjuk ke database PostgreSQL test / schema `?schema=test` di Supabase)[cite: 7].
- **Aturan Mutlak:** **Dilarang melakukan mock pada `PrismaService` atau repository di dalam file `*.repository.integration-spec.ts`**[cite: 7]. Pengujian ini wajib menembak database PostgreSQL nyata (dengan setup/cleanup data uji fiktif di `beforeEach`/`afterEach`) untuk membuktikan[cite: 7]:
  - Query CRUD, filter kepemilikan `userId` (`T01`), dan relasi *foreign key* bekerja benar di DB nyata[cite: 7].
  - Optimistic concurrency control (`version` / `revision`) benar-benar menolak update basi saat terjadi race condition (`T15`)[cite: 7].
  - Unique constraint pada `(user_id, idempotency_key)` dan `(user_id, subject, semester)` berfungsi sebagaimana mestinya[cite: 7].
  - Transaksi (`prisma.$transaction`) pada penyimpanan rencana + tugas (`plans` + `tasks`) atau penghapusan akun (`DELETE /api/account-data`) melakukan *rollback* utuh bila salah satu langkah gagal[cite: 7].

### 7.4 API / E2E Test (`test/e2e/*.e2e-spec.ts`)

- Menggunakan `Supertest` terhadap aplikasi NestJS utuh yang terhubung ke DB test untuk memverifikasi perjalanan end-to-end dari onboarding hingga ekspor paspor[cite: 7].

## 8. Definition of Done (DoD) per Module

Sebuah module dinyatakan selesai (`done`) hanya jika memenuhi seluruh daftar periksa berikut[cite: 7]:
- [ ] Folder `dto/` berisi schema Zod lengkap untuk input/query dan terpasang lewat `ZodValidationPipe`[cite: 7].
- [ ] Folder `interfaces/` berisi kontrak `I<Entity>Repository` dan `I<Entity>Service` beserta token `Symbol`[cite: 7].
- [ ] `<entity>.service.spec.ts` dan `<entity>.controller.spec.ts` lulus 100% (`pnpm test`)[cite: 7].
- [ ] `<entity>.repository.integration-spec.ts` lulus terhadap PostgreSQL test nyata (`pnpm test:integration`) tanpa mock DB[cite: 7].
- [ ] Otorisasi pemilik (`userId`), idempotency key, dan pemeriksaan versi (`expectedVersion`) telah diterapkan dan diuji[cite: 7].
- [ ] Dokumentasi Swagger (`/docs`) sudah terpasang pada seluruh endpoint di controller[cite: 7].