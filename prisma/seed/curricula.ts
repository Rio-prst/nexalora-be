import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PLACEHOLDER_MARK, SOURCE_IDS } from './config.js';

const CURRICULA = [
  {
    programId: 'ugm-inf-s1',
    curriculumYear: 2024,
    version: 'seed-v1',
    sourceId: SOURCE_IDS.UGM,
    rulesJson: [
      {
        group: 'Mata Kuliah Wajib',
        note: `${PLACEHOLDER_MARK} daftar dan bobot belum diverifikasi kurator`,
        subjects: [],
      },
      {
        group: 'Mata Kuliah Pilihan',
        note: `${PLACEHOLDER_MARK} daftar dan bobot belum diverifikasi kurator`,
        subjects: [],
      },
    ],
  },
  {
    programId: 'itb-inf-s1',
    curriculumYear: 2024,
    version: 'seed-v1',
    sourceId: SOURCE_IDS.ITB,
    rulesJson: [
      {
        group: 'Mata Kuliah Wajib',
        note: `${PLACEHOLDER_MARK} daftar dan bobot belum diverifikasi kurator`,
        subjects: [],
      },
    ],
  },
];

export async function seedCurricula(prisma: PrismaClient): Promise<void> {
  for (const curriculum of CURRICULA) {
    await prisma.curriculum.upsert({
      where: {
        programId_curriculumYear_version: {
          programId: curriculum.programId,
          curriculumYear: curriculum.curriculumYear,
          version: curriculum.version,
        },
      },
      create: curriculum,
      update: {
        sourceId: curriculum.sourceId,
        rulesJson: curriculum.rulesJson,
      },
    });
  }
}
