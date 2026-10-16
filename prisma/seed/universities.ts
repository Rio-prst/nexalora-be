import type { PrismaClient } from '../../src/generated/prisma/client.js';

const UNIVERSITIES = [
  {
    id: 'ugm',
    name: 'Universitas Gadjah Mada',
    cityCode: 'ID-YO-01',
    provinceCode: 'ID-YO',
    officialWebsite: 'https://ugm.ac.id',
  },
  {
    id: 'itb',
    name: 'Institut Teknologi Bandung',
    cityCode: 'ID-JB-21',
    provinceCode: 'ID-JB',
    officialWebsite: 'https://itb.ac.id',
  },
  {
    id: 'ui',
    name: 'Universitas Indonesia',
    cityCode: 'ID-DK-31',
    provinceCode: 'ID-DK',
    officialWebsite: 'https://ui.ac.id',
  },
] as const;

export async function seedUniversities(prisma: PrismaClient): Promise<void> {
  for (const university of UNIVERSITIES) {
    await prisma.university.upsert({
      where: { id: university.id },
      create: university,
      update: university,
    });
  }
}
