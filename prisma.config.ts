import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Resolusi URL untuk Prisma CLI (migrate / db push / studio).
 *
 * Prioritas:
 *  1. `DIRECT_URL`  -> koneksi langsung (tanpa pooler). WAJIB dipakai Prisma CLI
 *     karena `migrate` butuh advisory lock yang tidak kompatibel dengan
 *     connection pooling.
 *  2. `DATABASE_URL` -> fallback ke Session Pooler Supabase (port 5432) kalau
 *     `DIRECT_URL` tidak diisi atau host direct tidak bisa dijangkau dari mesin ini.
 *
 * Catatan: runtime aplikasi TIDAK memakai nilai ini. Runtime memakai
 * `DATABASE_URL` (pooler) melalui driver adapter `@prisma/adapter-pg`
 * di `src/infra/prisma/prisma.service.ts`.
 */
function resolveMigrationUrl(): string {
  const directUrl = process.env.DIRECT_URL?.trim();
  if (directUrl) return directUrl;

  const pooledUrl = process.env.DATABASE_URL?.trim();
  if (pooledUrl) return pooledUrl;

  throw new Error(
    'No database credentials found. Set DIRECT_URL (used by the Prisma CLI) or ' +
      'at least DATABASE_URL in the .env file. See .env.example.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: resolveMigrationUrl(),
  },
});