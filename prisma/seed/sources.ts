import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PLACEHOLDER_MARK, REVIEW_STATUS, SOURCE_IDS } from './config.js';

const SOURCES = [
  {
    id: SOURCE_IDS.DIKTI,
    publisher: 'Kementerian Pendidikan, Kebudayaan, Riset dan Teknologi',
    title: `${PLACEHOLDER_MARK} Daftar Program Studi Jenjang S1 — menunggu verifikasi kurator`,
    url: 'https://example.com/placeholder/dikti/daftar-program-studi',
    applicableYear: 2026,
  },
  {
    id: SOURCE_IDS.UGM,
    publisher: 'Universitas Gadjah Mada',
    title: `${PLACEHOLDER_MARK} Program Studi dan Biaya Kuliah UGM — menunggu verifikasi kurator`,
    url: 'https://example.com/placeholder/ugm/biaya-kuliah',
    applicableYear: 2026,
  },
  {
    id: SOURCE_IDS.ITB,
    publisher: 'Institut Teknologi Bandung',
    title: `${PLACEHOLDER_MARK} Program Studi dan Biaya Kuliah ITB — menunggu verifikasi kurator`,
    url: 'https://example.com/placeholder/itb/biaya-kuliah',
    applicableYear: 2026,
  },
  {
    id: SOURCE_IDS.KIP,
    publisher: 'Kementerian Pendidikan, Kebudayaan, Riset dan Teknologi',
    title: `${PLACEHOLDER_MARK} Panduan Beasiswa KIP Kuliah — menunggu verifikasi kurator`,
    url: 'https://example.com/placeholder/kip-kuliah',
    applicableYear: 2026,
  },
] as const;

export async function seedSources(prisma: PrismaClient): Promise<void> {
  const checkedAt = new Date();

  for (const source of SOURCES) {
    const payload = { ...source, reviewStatus: REVIEW_STATUS, checkedAt };

    await prisma.source.upsert({
      where: { id: source.id },
      create: payload,
      update: payload,
    });
  }
}
