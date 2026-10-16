import { PublicationStatus } from '../../src/generated/prisma/enums.js';
import type { PublicationStatus as PublicationStatusType } from '../../src/generated/prisma/enums.js';

const PUBLICATION_VALUES: readonly PublicationStatusType[] =
  Object.values(PublicationStatus);

function parsePublicationStatus(): PublicationStatusType {
  const raw = process.env.SEED_PUBLICATION_STATUS?.trim();
  if (!raw) return PublicationStatus.DRAFT;

  const value = raw.toUpperCase();
  const allowed = PUBLICATION_VALUES as readonly string[];
  if (!allowed.includes(value)) {
    throw new Error(
      `SEED_PUBLICATION_STATUS="${raw}" is invalid. Allowed values: ${allowed.join(', ')}`,
    );
  }
  return value as PublicationStatusType;
}

function parseReviewStatus(): string {
  const raw = process.env.SEED_REVIEW_STATUS?.trim();
  return raw ? raw.toUpperCase() : 'PENDING';
}

/**
 * Status publikasi untuk seluruh baris katalog yang di-seed.
 *
 * Default `DRAFT` disengaja: `GET /api/catalog` hanya mengexpose baris
 * `PUBLISHED`, sehingga angka biaya placeholder di seed tidak pernah
 * sampai ke pengguna sebagai fakta (AC-07A / AC-10A).
 *
 * Set `SEED_PUBLICATION_STATUS=PUBLISHED` HANYA untuk demo lokal.
 */
export const PUBLICATION_STATUS = parsePublicationStatus();

/** Status verifikasi pada tabel `sources` (kolom `review_status`, tipe String). */
export const REVIEW_STATUS = parseReviewStatus();

/** Tahun akademik default untuk data biaya seed. */
export const SEED_ACADEMIC_YEAR = 2026;

/**
 * `Source.id` adalah kolom `uuid`, bukan `VarChar` seperti model katalog
 * lainnya. Every table that references it (programs, cost_profiles,
 * curricula, scholarships) also uses a `uuid` FK, matching docs/ERD.md.
 *
 * These are fixed v4-shaped UUIDs rather than slugs: Postgres rejects
 * non-UUID text outright, and fixed values keep the seed idempotent so
 * `upsert({ where: { id } })` finds the same row on every run.
 */
export const SOURCE_IDS = {
  DIKTI: '0f000000-0000-4000-8000-000000000001',
  UGM: '0f000000-0000-4000-8000-000000000002',
  ITB: '0f000000-0000-4000-8000-000000000003',
  KIP: '0f000000-0000-4000-8000-000000000004',
} as const;

/** Penanda yang harus muncul di teks apa pun yang isinya belum terverifikasi. */
export const PLACEHOLDER_MARK = '[PLACEHOLDER]';
