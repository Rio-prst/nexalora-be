import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PUBLICATION_STATUS, REVIEW_STATUS } from './seed/config.js';
import { seedSources } from './seed/sources.js';
import { seedMajors } from './seed/majors.js';
import { seedUniversities } from './seed/universities.js';
import { seedPrograms } from './seed/programs.js';
import { seedCostProfiles } from './seed/costs.js';
import { seedCurricula } from './seed/curricula.js';
import { seedScholarships } from './seed/scholarships.js';
import { seedMissions } from './seed/missions.js';
import { seedCareers } from './seed/careers.js';

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu lengkapi nilainya.',
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    // Prisma 7 memakai node-pg, yang memvalidasi sertifikat TLS lebih ketat
    // daripada engine Rust di Prisma 6. Supabase memakai rantai sertifikat yang
    // node-pg tidak selalu percaya, sehingga bisa muncul error P1010. Setelan
    // longgar ini wajar untuk pengembangan, dan WAJIB diketatkan di produksi
    // lewat NODE_EXTRA_CA_CERTS.
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

async function main(): Promise<void> {
  const prisma = createClient();

  try {
    await seedSources(prisma);
    await seedMajors(prisma);
    await seedUniversities(prisma);
    await seedPrograms(prisma);
    await seedCostProfiles(prisma);
    await seedCurricula(prisma);
    await seedScholarships(prisma);
    await seedMissions(prisma);
    await seedCareers(prisma);

    const [
      sources,
      majors,
      universities,
      programs,
      costProfiles,
      curricula,
      scholarships,
      missions,
      careers,
      skills,
      careerMajors,
      careerSkills,
    ] = await Promise.all([
      prisma.source.count(),
      prisma.major.count(),
      prisma.university.count(),
      prisma.program.count(),
      prisma.costProfile.count(),
      prisma.curriculum.count(),
      prisma.scholarship.count(),
      prisma.mission.count(),
      prisma.career.count(),
      prisma.skill.count(),
      prisma.careerMajor.count(),
      prisma.careerSkill.count(),
    ]);

    console.log('\nSeed selesai.\n');
    console.table({
      'publication status': PUBLICATION_STATUS,
      'review status': REVIEW_STATUS,
    });
    console.table({
      sources,
      majors,
      universities,
      programs,
      cost_profiles: costProfiles,
      curricula,
      scholarships,
      missions,
      careers,
      skills,
      career_majors: careerMajors,
      career_skills: careerSkills,
    });

    if (PUBLICATION_STATUS !== 'PUBLISHED') {
      console.log(
        `\nGET /api/catalog hanya mengexpose baris PUBLISHED, jadi katalog masih kosong.\n` +
          `Angka biaya di seed adalah PLACEHOLDER dan belum diverifikasi kurator.\n` +
          `Untuk demo lokal: SEED_PUBLICATION_STATUS=PUBLISHED pnpm run prisma:seed\n`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed gagal:', error);
  process.exit(1);
});
