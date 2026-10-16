import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ScholarshipStatus } from '../../src/generated/prisma/enums.js';
import { PLACEHOLDER_MARK, SOURCE_IDS } from './config.js';

const SCHOLARSHIPS = [
  {
    id: 'kip-kuliah-2026',
    name: 'KIP Kuliah',
    organizer: 'Kementerian Pendidikan, Kebudayaan, Riset dan Teknologi',
    aidType: 'Paket Beasiswa',
    scopeJson: {
      note: `${PLACEHOLDER_MARK} syarat dan kuota belum diverifikasi kurator`,
      stages: ['SMA/SMK/MA sederajat', 'D3', 'S1'],
      fields: ['EKONOMI', 'NON_EKONOMI'],
    },
    benefitsJson: {
      note: `${PLACEHOLDER_MARK} nominal belum diverifikasi kurator`,
      tuition: { min: null, max: null },
      livingAllowanceMonthly: { min: null, max: null },
    },
    datesJson: {
      note: `${PLACEHOLDER_MARK} tanggal belum diverifikasi kurator`,
      registrationOpens: null,
      registrationCloses: null,
      announcement: null,
    },
    status: ScholarshipStatus.UNKNOWN,
    sourceId: SOURCE_IDS.KIP,
  },
  {
    id: 'beasiswa-unggulan-daerah',
    name: 'Beasiswa Unggulan Daerah',
    organizer: `${PLACEHOLDER_MARK} penyelenggara belum diverifikasi kurator`,
    aidType: 'Beasiswa Penuh',
    scopeJson: {
      note: `${PLACEHOLDER_MARK} fokus daemon belum diverifikasi kurator`,
      description:
        'Beasiswa bagi lulusan SMA/SMK/MA di daerah dengan prestasi akademik tinggi.',
    },
    benefitsJson: {
      note: `${PLACEHOLDER_MARK} nominal belum diverifikasi kurator`,
      tuition: { min: null, max: null },
    },
    datesJson: {
      note: `${PLACEHOLDER_MARK} tanggal belum diverifikasi kurator`,
      registrationOpens: null,
      registrationCloses: null,
    },
    status: ScholarshipStatus.UNKNOWN,
    sourceId: SOURCE_IDS.DIKTI,
  },
];

export async function seedScholarships(prisma: PrismaClient): Promise<void> {
  for (const scholarship of SCHOLARSHIPS) {
    await prisma.scholarship.upsert({
      where: { id: scholarship.id },
      create: scholarship,
      update: {
        name: scholarship.name,
        organizer: scholarship.organizer,
        aidType: scholarship.aidType,
        scopeJson: scholarship.scopeJson,
        benefitsJson: scholarship.benefitsJson,
        datesJson: scholarship.datesJson,
        status: scholarship.status,
        sourceId: scholarship.sourceId,
      },
    });
  }
}
