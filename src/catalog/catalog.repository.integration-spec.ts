import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { HousingMode, PublicationStatus } from '../generated/prisma/enums.js';
import { CatalogRepository } from './catalog.repository.js';

const SOURCE_ID = '0f000000-0000-4000-8000-0000000f0001';
const UNIVERSITY_ID = 'test-catalog-univ';
const MAJOR_PUBLISHED = 'test-catalog-major-pub';
const MAJOR_DRAFT = 'test-catalog-major-draft';
const PROGRAM_PUBLISHED = 'test-catalog-prog-pub';
const PROGRAM_DRAFT = 'test-catalog-prog-draft';
const PROGRAM_UNDER_DRAFT_MAJOR = 'test-catalog-prog-orphan';

let prisma: PrismaClient;
let repository: CatalogRepository;

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

  repository = new CatalogRepository(prisma as never);

  await prisma.source.create({
    data: {
      id: SOURCE_ID,
      url: 'https://example.test/source',
      publisher: 'Curator Team',
      title: 'Integration fixture',
      applicableYear: 2026,
      checkedAt: new Date('2026-09-01T00:00:00.000Z'),
      reviewStatus: 'PENDING',
    },
  });

  await prisma.university.create({
    data: {
      id: UNIVERSITY_ID,
      name: 'Universitas Fixture',
      cityCode: 'YK',
      provinceCode: 'DI',
      officialWebsite: 'https://example.test',
    },
  });

  await prisma.major.createMany({
    data: [
      {
        id: MAJOR_PUBLISHED,
        name: 'Informatika Fixture',
        summary: 'Published major',
        heuristicWeightsJson: {},
        prepSubjectsJson: ['Math'],
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      {
        id: MAJOR_DRAFT,
        name: 'Jurusan Fixture Draft',
        summary: 'Draft major',
        heuristicWeightsJson: {},
        prepSubjectsJson: [],
        publicationStatus: PublicationStatus.DRAFT,
      },
    ],
  });

  await prisma.program.createMany({
    data: [
      {
        id: PROGRAM_PUBLISHED,
        majorId: MAJOR_PUBLISHED,
        universityId: UNIVERSITY_ID,
        name: 'Ilmu Komputer Fixture',
        campusLocation: 'Yogyakarta',
        degree: 'S1',
        admissionPathsJson: ['SNBT'],
        sourceId: SOURCE_ID,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      {
        id: PROGRAM_DRAFT,
        majorId: MAJOR_PUBLISHED,
        universityId: UNIVERSITY_ID,
        name: 'Program Fixture Draft',
        campusLocation: 'Yogyakarta',
        degree: 'S1',
        admissionPathsJson: [],
        sourceId: SOURCE_ID,
        publicationStatus: PublicationStatus.DRAFT,
      },
      {
        id: PROGRAM_UNDER_DRAFT_MAJOR,
        majorId: MAJOR_DRAFT,
        universityId: UNIVERSITY_ID,
        name: 'Program Fixture Orphan',
        campusLocation: 'Yogyakarta',
        degree: 'S1',
        admissionPathsJson: [],
        sourceId: SOURCE_ID,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    ],
  });

  await prisma.costProfile.create({
    data: {
      programId: PROGRAM_PUBLISHED,
      academicYear: 2026,
      admissionTrack: 'SNBT',
      housingMode: HousingMode.RENT,
      version: 'fixture-v1',
      componentsJson: {
        tuitionPerSemester: { min: null, max: null },
        livingCostMonthly: { min: 1_500_000, max: 2_000_000 },
        recurringSupportMonthly: null,
        upfrontCost: { min: null, max: 0 },
      },
      sourceId: SOURCE_ID,
    },
  });

  await prisma.curriculum.create({
    data: {
      programId: PROGRAM_PUBLISHED,
      curriculumYear: 2024,
      version: 'fixture-v1',
      rulesJson: [],
      sourceId: SOURCE_ID,
    },
  });
});

afterAll(async () => {
  await prisma?.program.deleteMany({
    where: { id: { startsWith: 'test-catalog-prog-' } },
  });
  await prisma?.major.deleteMany({
    where: { id: { startsWith: 'test-catalog-major-' } },
  });
  await prisma?.university.deleteMany({ where: { id: UNIVERSITY_ID } });
  await prisma?.source.deleteMany({ where: { id: SOURCE_ID } });
  await prisma?.$disconnect();
});

describe('CatalogRepository', () => {
  describe('listPublishedPrograms', () => {
    it('returns only programs whose status is PUBLISHED', async () => {
      const programs = await repository.listPublishedPrograms();
      const ids = programs.map((program) => program.id);

      expect(ids).toContain(PROGRAM_PUBLISHED);
      expect(ids).not.toContain(PROGRAM_DRAFT);
    });

    it('hides a PUBLISHED program whose major is still DRAFT', async () => {
      const programs = await repository.listPublishedPrograms();
      const ids = programs.map((program) => program.id);

      expect(ids).not.toContain(PROGRAM_UNDER_DRAFT_MAJOR);
    });

    it('attaches the source evidence to every program', async () => {
      const programs = await repository.listPublishedPrograms();
      const found = programs.find(
        (program) => program.id === PROGRAM_PUBLISHED,
      );

      expect(found?.evidence.sourceId).toBe(SOURCE_ID);
      expect(found?.evidence.applicableYear).toBe(2026);
      expect(found?.university.id).toBe(UNIVERSITY_ID);
    });
  });

  describe('listPublishedMajors', () => {
    it('excludes majors that are not PUBLISHED', async () => {
      const majors = await repository.listPublishedMajors();
      const ids = majors.map((major) => major.id);

      expect(ids).toContain(MAJOR_PUBLISHED);
      expect(ids).not.toContain(MAJOR_DRAFT);
    });
  });

  describe('findPublishedProgram', () => {
    it('returns null for a DRAFT program', async () => {
      await expect(
        repository.findPublishedProgram(PROGRAM_DRAFT),
      ).resolves.toBeNull();
    });

    it('returns null for a PUBLISHED program under a DRAFT major', async () => {
      await expect(
        repository.findPublishedProgram(PROGRAM_UNDER_DRAFT_MAJOR),
      ).resolves.toBeNull();
    });

    it('preserves null cost components rather than coercing them to zero (AC-03B)', async () => {
      const program = await repository.findPublishedProgram(PROGRAM_PUBLISHED);
      const components = program?.costProfiles[0]?.components;

      expect(components?.tuitionPerSemester).toEqual({ min: null, max: null });
      expect(components?.recurringSupportMonthly).toBeNull();
      expect(components?.upfrontCost).toEqual({ min: null, max: 0 });
    });

    it('returns the curriculum with its raw year for the service to grade', async () => {
      const program = await repository.findPublishedProgram(PROGRAM_PUBLISHED);

      expect(program?.curricula[0]?.curriculumYear).toBe(2024);
    });
  });
});
