# Nexalora — API Contract

- **Versi kontrak:** v1
- **Base path:** `/api`
- **Format:** REST/JSON
- **Auth:** Bearer token (Supabase JWT) atau header mode Demo
- **Dokumentasi interaktif:** Swagger UI `/docs`
- **Status:** Baseline turunan dari PRD Nexalora Bagian 06 (Halaman 29–30)

## 1. Konvensi umum

### 1.1 Headers

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
Accept: application/json
Idempotency-Key: <unique-client-generated-key>
X-Request-Id: <optional-trace-id>
```

- `Idempotency-Key` **wajib** untuk `POST /api/attempts` dan `POST /api/plans`.
- Seluruh endpoint privat memvalidasi bahwa `user.id` dari token JWT sama dengan pemilik resource (`user_id` / `owner_id`).

### 1.2 Response sukses

```json
{
  "data": {},
  "meta": {
    "requestId": "req_01..."
  }
}
```

### 1.3 Response error

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Data has changed on another device or tab",
    "details": {
      "expectedVersion": 2,
      "latestVersion": 3
    },
    "requestId": "req_01..."
  }
}
```

### 1.4 Status code

| Status | Kode Error Standar | Makna |
|---|---|---|
| `200` | — | Request sukses |
| `201` | — | Resource berhasil dibuat |
| `400` | `VALIDATION_ERROR` | Skema input tidak valid |
| `401` | `UNAUTHORIZED` | Belum masuk atau token JWT tidak valid/kedaluwarsa |
| `403` | `FORBIDDEN` | Akses lintas akun atau role tidak berwenang |
| `404` | `NOT_FOUND` | Resource tidak ada atau disembunyikan karena bukan pemilik (`AC-01B`) |
| `409` | `VERSION_CONFLICT` / `IDEMPOTENCY_KEY_REUSED` | Konflik versi (`expectedVersion`) atau duplikasi kunci idempotensi dengan isi berbeda |
| `422` | `DOMAIN_RULE_VIOLATION` | Kondisi bisnis belum terpenuhi (mis. alokasi petugas $> 4$, siklus prasyarat task) |
| `429` | `RATE_LIMITED` | Pembatasan frekuensi request |
| `500` | `INTERNAL_ERROR` | Gagal internal dengan `requestId` (tanpa membocorkan stack trace) |

## 2. Endpoint Matrix

Tabel ini memuat **16 endpoint utama PRD (Halaman 29)** ditambah **6 endpoint baca (`GET`)** untuk mendukung *state restoration* pada arsitektur repo terpisah.

| No | Method | Endpoint | Akses | Tujuan |
|---|---|---|---|---|
| 1 | `GET` | `/api/catalog` | Publik | Daftar jurusan, prodi-kampus, misi, karier, kurikulum, dan beasiswa terbit (`PUBLISHED`) |
| 2 | `GET` | `/api/catalog/programs/:id` | Publik | Detail lengkap 1 prodi-kampus beserta biaya, kurikulum, sumber, dan karier terkait |
| 3 | `GET` | `/api/profile` | Owner | Mengambil profil aktif, nilai akademik, dan status *consent* siswa |
| 4 | `PATCH` | `/api/profile` | Owner | Memperbarui profil, nilai akademik, dan *consent* dengan pemeriksaan `expectedVersion` |
| 5 | `POST` | `/api/interests` | Owner | Menyimpan jawaban 12 butir minat (`instrumentVersion`, `answers`) |
| 6 | `POST` | `/api/recommendations` | Owner | Menghitung dan menyimpan `recommendation_run` dari data server |
| 7 | `GET` | `/api/recommendations/latest` | Owner | Mengambil hasil rekomendasi aktif terakhir beserta status kesegarannya |
| 8 | `POST` | `/api/attempts` | Owner | Memulai *attempt* simulasi baru (`Idempotency-Key` wajib) |
| 9 | `GET` | `/api/attempts/:id` | Owner | Mengambil *state* dan *draft artifact* simulasi (`AC-04B`) |
| 10 | `PATCH` | `/api/attempts/:id` | Owner | *Autosave* artefak simulasi dengan `expectedRevision` |
| 11 | `POST` | `/api/attempts/:id/run` | Owner | Menjalankan *simulation runner* server untuk `scenarioId` & `expectedRevision` |
| 12 | `POST` | `/api/reflections` | Owner | Menyimpan refleksi pasca-misi dan mengembalikan pratinjau perubahan pilihan |
| 13 | `GET` | `/api/shortlist` | Owner | Mengambil daftar maksimal 3 prodi-kampus yang sedang dibandingkan |
| 14 | `PUT` | `/api/shortlist` | Owner | Menyimpan maksimal 3 `programIds` untuk dibandingkan |
| 15 | `POST` | `/api/scenarios` | Owner | Menghitung skenario *what-if* (`overrides` biaya/lokasi) tanpa mengubah profil |
| 16 | `POST` | `/api/plans/preview` | Owner | Menghasilkan draf rencana 30 hari secara deterministik |
| 17 | `POST` | `/api/plans` | Owner | Mengonfirmasi dan mengaktifkan rencana 30 hari beserta *tasks* (`Idempotency-Key` wajib) |
| 18 | `GET` | `/api/plans/active` | Owner | Mengambil rencana 30 hari yang sedang aktif beserta daftar *tasks* |
| 19 | `PATCH` | `/api/tasks/:id` | Owner | Memperbarui status, tanggal jatuh tempo, atau bukti tugas dengan `expectedVersion` |
| 20 | `POST` | `/api/passports` | Owner | Membuat *snapshot* paspor dengan *server-side redaction* berdasarkan `includeFields` |
| 21 | `GET` | `/api/passports/:id` | Owner | Mengambil *snapshot* paspor untuk halaman cetak A4 (`AC-09E`) |
| 22 | `DELETE` | `/api/account-data` | Owner | Menghapus seluruh data privat akun siswa (`NFR-04`) |

---

## 3. Spesifikasi Payload Utama

### 3.1 `PATCH /api/profile`

Request:
```json
{
  "expectedVersion": 1,
  "consent": {
    "purposeVersion": "consent-v1",
    "isAccepted": true
  },
  "displayName": "Nadia",
  "gradeLevel": "XII",
  "graduationYear": 2027,
  "cityCode": "ID-JT-74",
  "provinceCode": "ID-JT",
  "relocationMode": "OPEN",
  "monthlyBudgetMin": 1500000,
  "monthlyBudgetMax": 2800000,
  "upfrontBudgetMax": 5000000,
  "housingMode": "RENT",
  "pinnedPrograms": ["ugm-inf-s1"],
  "schoolSubjects": [
    { "subject": "Matematika", "semester": 4, "score": 88, "scale": "0-100" }
  ]
}
```
Jika `expectedVersion` berbeda dari `profiles.version` di DB, kembalikan `409 VERSION_CONFLICT`.

### 3.2 `POST /api/interests`

Request:
```json
{
  "instrumentVersion": "v0.1",
  "answers": [
    { "itemId": "q1", "dimension": "LOGIC_SYSTEM", "value": 5, "state": "ANSWERED" },
    { "itemId": "q2", "dimension": "LOGIC_SYSTEM", "value": 4, "state": "ANSWERED" },
    { "itemId": "q3", "dimension": "LOGIC_SYSTEM", "value": null, "state": "UNKNOWN" }
  ]
}
```

### 3.3 `POST /api/recommendations`

Request:
```json
{
  "profileVersion": 2,
  "activeReflectionIds": ["550e8400-e29b-41d4-a716-446655440000"],
  "expectedCatalogVersion": "pilot-v1"
}
```

Response `201`:
```json
{
  "data": {
    "runId": "run_01...",
    "ruleVersion": "heuristic-v1",
    "profileVersion": 2,
    "coverage": {
      "answeredDimensions": 4,
      "isSufficientForPersonalization": true
    },
    "majors": [
      {
        "majorId": "INF",
        "experienceStatus": "TRIED",
        "reasons": [
          { "code": "ACTIVITY_INTEREST", "evidenceId": "submission_01..." },
          { "code": "REFLECTION_CONTINUE", "evidenceId": "550e8400-e29b-41d4-a716-446655440000" }
        ]
      }
    ],
    "items": [
      {
        "programId": "ugm-inf-s1",
        "isPinned": true,
        "reasons": [
          { "code": "ACTIVITY_INTEREST", "evidenceId": "submission_01..." }
        ],
        "academicStatus": "PARTIAL",
        "costStatus": "DEPENDS_ON_SCENARIO",
        "costBreakdown": {
          "monthlyEquivalentMin": 2600000,
          "monthlyEquivalentMax": 3100000,
          "upfrontMax": 2000000,
          "sourceYear": 2026
        },
        "admissionProbability": null
      }
    ]
  },
  "meta": { "requestId": "req_01..." }
}
```

### 3.4 `POST /api/attempts/:id/run`

Request (Contoh Misi Teknik Industri `ind-antrean-v1`):
```json
{
  "scenarioId": "scenario_1",
  "expectedRevision": 3,
  "artifact": {
    "missionType": "IND",
    "workerAllocation": [2, 1, 1]
  }
}
```

Response `200`:
```json
{
  "data": {
    "attemptId": "att_01...",
    "revision": 3,
    "scenarioId": "scenario_1",
    "status": "RESULT_READY",
    "result": {
      "horizonSeconds": 600,
      "totalCustomers": 12,
      "completedCount": 9,
      "inQueueOrProgressCount": 3,
      "firstCustomerDoneAtSec": 90,
      "secondCustomerDoneAtSec": 150,
      "averageWaitSecondsCompleted": 78.33,
      "maxQueueLength": 4
    }
  },
  "meta": { "requestId": "req_01..." }
}
```

### 3.5 `POST /api/passports`

Request:
```json
{
  "recommendationRunId": "run_01...",
  "planId": "plan_01...",
  "includeFields": ["studyChoices", "simulationSummary", "careerGoals", "planTasks"]
}
```
Karena `academicRecords`, `budget`, dan `privateReflectionNotes` tidak ada di `includeFields`, server **wajib menghapus** ketiganya dari `snapshot_json` dan mencatatnya di `redactions_json` (`AC-09B`, `T14`).