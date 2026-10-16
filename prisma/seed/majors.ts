import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PUBLICATION_STATUS } from './config.js';

/**
 * Bobot heuristik `heuristic-v1` disalin PERSIS dari matriks pada
 * docs/BUSSINES-RULES.md §1 — bukan estimasi. Nilai ini adalah fixture
 * deterministik, bukan fakta eksternal, jadi boleh langsung dipakai.
 */
const MAJORS = [
  {
    id: 'INF',
    name: 'Informatika',
    summary:
      'Mempelajari perancangan, pembangunan, dan pengujian sistem perangkat lunak serta pengolahannya.',
    heuristicWeightsJson: {
      LOGIC_SYSTEM: 0.55,
      PROCESS_DATA: 0.2,
      VISUAL_COMM: 0.1,
      EXPLORATION_COLLAB: 0.15,
    },
    prepSubjectsJson: ['Matematika', 'Fisika', 'Informatika'],
  },
  {
    id: 'IND',
    name: 'Teknik Industri',
    summary:
      'Mempelajari perancangan, perbaikan, dan pengoperasian sistem kerja serta proses produksi.',
    heuristicWeightsJson: {
      LOGIC_SYSTEM: 0.2,
      PROCESS_DATA: 0.5,
      VISUAL_COMM: 0.1,
      EXPLORATION_COLLAB: 0.2,
    },
    prepSubjectsJson: ['Matematika', 'Fisika', 'Kimia'],
  },
  {
    id: 'DKV',
    name: 'Desain Komunikasi Visual',
    summary:
      'Mempelajari perancangan pesan visual untuk media cetak dan digital, termasuk tipografi dan tata letak.',
    heuristicWeightsJson: {
      LOGIC_SYSTEM: 0.1,
      PROCESS_DATA: 0.1,
      VISUAL_COMM: 0.6,
      EXPLORATION_COLLAB: 0.2,
    },
    prepSubjectsJson: ['Seni Budaya', 'Bahasa Indonesia', 'Prakarya'],
  },
];

export async function seedMajors(prisma: PrismaClient): Promise<void> {
  for (const major of MAJORS) {
    const payload = { ...major, publicationStatus: PUBLICATION_STATUS };

    await prisma.major.upsert({
      where: { id: major.id },
      create: payload,
      update: payload,
    });
  }
}
