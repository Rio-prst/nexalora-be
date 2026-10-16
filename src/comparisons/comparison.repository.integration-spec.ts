import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { ComparisonRepository } from './comparison.repository.js';

const USER_A = '44444444-0000-4000-8000-0000000000a1';
const USER_B = '44444444-0000-4000-8000-0000000000b2';

const SOURCE_ID = '0f000000-0000-4000-8000-0000000c0001';
const UNIVERSITY_ID = 'cmp-catalog-univ';
const MAJOR_ID = 'cmp-catalog-major';
const PROGRAM_PUBLISHED = 'cmp-prog-published';
const PROGRAM_DRAFT = 'cmp-prog-draft';

let prisma: PrismaClient;
let repository: ComparisonRepository;

async function resetScenarios(): Promise<void> {
  await prisma.scenario.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma.shortlist.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
}

beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL_TEST?.trim();

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL_TEST is not set; integration tests cannot run',
    );
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      ssl: { rejectUnauthorized: false },
    }),
  });

  repository = new ComparisonRepository(prisma as never);

  await prisma.profile.createMany({
    data: [
      {
        userId: USER_A,
        monthlyBudgetMax: 3_000_000,
        upfrontBudgetMax: 5_000_000,
      },
      { userId: USER_B, monthlyBudgetMax: null },
    ],
    skipDuplicates: true,
  });

  await resetScenarios();

  await prisma.program.deleteMany({
    where: { id: { in: [PROGRAM_PUBLISHED, PROGRAM_DRAFT] } },
  });

  await prisma.costProfile.deleteMany({
    where: { programId: { in: [PROGRAM_PUBLISHED, PROGRAM_DRAFT] } },
  });

  await prisma.source.upsert({
    where: { id: SOURCE_ID },
    create: {
      id: SOURCE_ID,
      url: 'https://example.test/source',
      publisher: 'Curator Team',
      title: 'Comparison fixture',
      applicableYear: 2026,
      checkedAt: new Date('2026-09-01T00:00:00.000Z'),
      reviewStatus: 'PENDING',
    },
    update: {},
  });

  await prisma.university.upsert({
    where: { id: UNIVERSITY_ID },
    create: {
      id: UNIVERSITY_ID,
      name: 'Universitas Comparison',
      cityCode: 'YK',
      provinceCode: 'DI',
      officialWebsite: 'https://example.test',
    },
    update: {},
  });

  await prisma.major.upsert({
    where: { id: MAJOR_ID },
    create: {
      id: MAJOR_ID,
      name: 'Jurusan Comparison',
      summary: 'Published major fixture',
      heuristicWeightsJson: {},
      prepSubjectsJson: ['Matematika'],
      publicationStatus: PublicationStatus.PUBLISHED,
    },
    update: { publicationStatus: PublicationStatus.PUBLISHED },
  });

  await prisma.program.createMany({
    data: [
      {
        id: PROGRAM_PUBLISHED,
        majorId: MAJOR_ID,
        universityId: UNIVERSITY_ID,
        name: 'Prodi Comparison Terbit',
        campusLocation: 'Yogyakarta',
        degree: 'S1',
        admissionPathsJson: ['SNBT'],
        sourceId: SOURCE_ID,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      {
        id: PROGRAM_DRAFT,
        majorId: MAJOR_ID,
        universityId: UNIVERSITY_ID,
        name: 'Prodi Comparison Draft',
        campusLocation: 'Yogyakarta',
        degree: 'S1',
        admissionPathsJson: [],
        sourceId: SOURCE_ID,
        publicationStatus: PublicationStatus.DRAFT,
      },
    ],
  });

  await prisma.costProfile.create({
    data: {
      programId: PROGRAM_PUBLISHED,
      academicYear: 2026,
      admissionTrack: 'SNBT',
      housingMode: 'RENT',
      version: 'fixture-v1',
      componentsJson: {
        tuitionPerSemester: { min: 6_000_000, max: 6_000_000 },
        livingCostMonthly: { min: 1_500_000, max: 1_500_000 },
        recurringSupportMonthly: null,
        upfrontCost: { min: 2_000_000, max: 2_000_000 },
      },
      sourceId: SOURCE_ID,
    },
  });
});

afterAll(async () => {
  await resetScenarios();
  await prisma?.costProfile.deleteMany({
    where: { programId: { in: [PROGRAM_PUBLISHED, PROGRAM_DRAFT] } },
  });
  await prisma?.program.deleteMany({
    where: { id: { in: [PROGRAM_PUBLISHED, PROGRAM_DRAFT] } },
  });
  await prisma?.major.deleteMany({ where: { id: MAJOR_ID } });
  await prisma?.university.deleteMany({ where: { id: UNIVERSITY_ID } });
  await prisma?.source.deleteMany({ where: { id: SOURCE_ID } });
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

describe('ComparisonRepository', () => {
  describe('findBaseline', () => {
    it('reads the stored budget without applying any override', async () => {
      const baseline = await repository.findBaseline(USER_A);

      expect(baseline?.monthlyBudgetMax).toBe(3_000_000);
      expect(baseline?.upfrontBudgetMax).toBe(5_000_000);
    });

    it('keeps an unknown budget as null', async () => {
      const baseline = await repository.findBaseline(USER_B);

      expect(baseline?.monthlyBudgetMax).toBeNull();
    });

    it('returns null for an account without a profile row', async () => {
      await expect(
        repository.findBaseline('cccccccc-0000-4000-8000-0000000000c3'),
      ).resolves.toBeNull();
    });
  });

  describe('shortlist', () => {
    it('creates then updates a single row instead of duplicating', async () => {
      const first = await repository.saveShortlist(USER_A, ['a', 'b'], 1);
      const second = await repository.saveShortlist(USER_A, ['c'], 1);

      expect(first.programIds).toEqual(['a', 'b']);
      expect(second.programIds).toEqual(['c']);

      const count = await prisma.shortlist.count({
        where: { userId: USER_A },
      });

      expect(count).toBe(1);
    });

    it('returns null before anything is stored', async () => {
      await expect(repository.findShortlist(USER_B)).resolves.toBeNull();
    });

    it('never leaks another account shortlist (T01)', async () => {
      const stored = await repository.saveShortlist(USER_A, ['a'], 1);

      expect(stored.programIds).toEqual(['a']);
      await expect(repository.findShortlist(USER_B)).resolves.toBeNull();
    });
  });

  describe('listPublishedCosts', () => {
    it('returns a cost profile for a published program', async () => {
      const costs = await repository.listPublishedCosts([PROGRAM_PUBLISHED]);

      expect(costs).toHaveLength(1);
      expect(costs[0]?.sourceYear).toBe(2026);
      expect(costs[0]?.components.tuitionPerSemester).toEqual({
        min: 6_000_000,
        max: 6_000_000,
      });
    });

    it('withholds a DRAFT program (AC-07A)', async () => {
      const costs = await repository.listPublishedCosts([PROGRAM_DRAFT]);

      expect(costs).toEqual([]);
    });

    it('returns nothing for an empty request', async () => {
      await expect(repository.listPublishedCosts([])).resolves.toEqual([]);
    });
  });

  describe('insertScenario', () => {
    it('records the base profile version it was computed against', async () => {
      const created = await repository.insertScenario({
        userId: USER_A,
        baseProfileVersion: 7,
        overrides: { monthlyBudgetMax: 10_000_000 },
        results: { programResults: [] },
      });

      expect(created.id).toBeTruthy();

      const row = await prisma.scenario.findUnique({
        where: { id: created.id },
        select: { baseProfileVersion: true },
      });

      expect(row?.baseProfileVersion).toBe(7);
    });

    it('never writes the override back to the profiles row (T10)', async () => {
      const before = await repository.findBaseline(USER_A);

      await repository.insertScenario({
        userId: USER_A,
        baseProfileVersion: before?.profileVersion ?? 1,
        overrides: { monthlyBudgetMax: 99_000_000 },
        results: {},
      });

      const after = await repository.findBaseline(USER_A);

      expect(after?.monthlyBudgetMax).toBe(3_000_000);
    });

    it('never returns another account scenario (T01)', async () => {
      const created = await repository.insertScenario({
        userId: USER_B,
        baseProfileVersion: 1,
        overrides: {},
        results: {},
      });

      const row = await prisma.scenario.findFirst({
        where: { id: created.id, userId: USER_A },
        select: { id: true },
      });

      expect(row).toBeNull();
    });
  });
});
