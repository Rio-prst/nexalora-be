import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PLACEHOLDER_MARK, PUBLICATION_STATUS, SOURCE_IDS } from './config.js';

const ADMISSION_PATHS = [
  {
    id: 'SNBP',
    label: 'Seleksi Nasional Berbasis Prestasi (SNBP)',
    note: `${PLACEHOLDER_MARK} kuota dan jadwal belum diverifikasi kurator`,
  },
  {
    id: 'SNBT',
    label: 'Seleksi Nasional Berbasis Tes (SNBT)',
    note: `${PLACEHOLDER_MARK} kuota dan jadwal belum diverifikasi kurator`,
  },
  {
    id: 'MANDIRI',
    label: 'Seleksi Mandiri Institutional',
    note: `${PLACEHOLDER_MARK} kuota dan jadwal belum diverifikasi kurator`,
  },
];

const PROGRAMS = [
  {
    id: 'ugm-inf-s1',
    majorId: 'INF',
    universityId: 'ugm',
    name: 'Informatika',
    campusLocation: 'Universitas Gadjah Mada, Sleman',
    degree: 'S1',
    sourceId: SOURCE_IDS.UGM,
  },
  {
    id: 'itb-inf-s1',
    majorId: 'INF',
    universityId: 'itb',
    name: 'Informatika',
    campusLocation: 'Institut Teknologi Bandung, Bandung',
    degree: 'S1',
    sourceId: SOURCE_IDS.ITB,
  },
  {
    id: 'ugm-ind-s1',
    majorId: 'IND',
    universityId: 'ugm',
    name: 'Teknik Industri',
    campusLocation: 'Universitas Gadjah Mada, Sleman',
    degree: 'S1',
    sourceId: SOURCE_IDS.UGM,
  },
  {
    id: 'itb-ind-s1',
    majorId: 'IND',
    universityId: 'itb',
    name: 'Teknik Industri',
    campusLocation: 'Institut Teknologi Bandung, Bandung',
    degree: 'S1',
    sourceId: SOURCE_IDS.ITB,
  },
  {
    id: 'itb-dkv-s1',
    majorId: 'DKV',
    universityId: 'itb',
    name: 'Desain Komunikasi Visual',
    campusLocation: 'Institut Teknologi Bandung, Bandung',
    degree: 'S1',
    sourceId: SOURCE_IDS.ITB,
  },
  {
    id: 'ugm-dkv-s1',
    majorId: 'DKV',
    universityId: 'ugm',
    name: 'Desain Komunikasi Visual',
    campusLocation: 'Universitas Gadjah Mada, Sleman',
    degree: 'S1',
    sourceId: SOURCE_IDS.UGM,
  },
] as const;

export async function seedPrograms(prisma: PrismaClient): Promise<void> {
  for (const program of PROGRAMS) {
    const payload = {
      ...program,
      admissionPathsJson: ADMISSION_PATHS,
      publicationStatus: PUBLICATION_STATUS,
    };

    await prisma.program.upsert({
      where: { id: program.id },
      create: payload,
      update: payload,
    });
  }
}
