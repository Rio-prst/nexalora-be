import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { RecommendationRepository } from './recommendation.repository.js';

const USER_A = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const USER_B = 'bbbbbbbb-0000-4000-8000-0000000000b2';

let prisma: PrismaClient;
let repository: RecommendationRepository;

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

  repository = new RecommendationRepository(prisma as never);

  await prisma.profile.createMany({
    data: [
      {
        userId: USER_A,
        monthlyBudgetMax: 3_000_000,
        upfrontBudgetMax: 5_000_000,
        pinnedProgramsJson: [],
      },
      { userId: USER_B, monthlyBudgetMax: null, pinnedProgramsJson: [] },
    ],
    skipDuplicates: true,
  });

  await prisma.recommendationRun.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
});

afterAll(async () => {
  await prisma?.recommendationRun.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

describe('RecommendationRepository', () => {
  describe('findProfile', () => {
    it('reads the budget and pinned programs', async () => {
      const profile = await repository.findProfile(USER_A);

      expect(profile?.version).toBeGreaterThan(0);
      expect(profile?.monthlyBudgetMax).toBe(3_000_000);
      expect(profile?.pinnedPrograms).toEqual([]);
    });

    it('returns null for an account without a profile row', async () => {
      const profile = await repository.findProfile(
        'cccccccc-0000-4000-8000-0000000000c3',
      );

      expect(profile).toBeNull();
    });
  });

  describe('findLatestInterestSubmission', () => {
    it('returns null before the student submits anything', async () => {
      const submission = await repository.findLatestInterestSubmission(USER_A);

      expect(submission).toBeNull();
    });
  });

  describe('findActiveReflections', () => {
    it('returns nothing when no ids were requested', async () => {
      await expect(
        repository.findActiveReflections(USER_A, []),
      ).resolves.toEqual([]);
    });
  });

  describe('insertRun', () => {
    it('stores the run and reads it back as the latest', async () => {
      const created = await repository.insertRun({
        userId: USER_A,
        profileVersion: 1,
        ruleVersion: 'heuristic-v1',
        catalogVersion: 'pilot-v1',
        inputsSnapshot: { probe: true },
        results: { items: [] },
      });

      expect(created.ruleVersion).toBe('heuristic-v1');
      expect(created.catalogVersion).toBe('pilot-v1');

      const latest = await repository.findLatestRun(USER_A);

      expect(latest?.id).toBe(created.id);
    });

    it('never exposes another account run (T01)', async () => {
      const latest = await repository.findLatestRun(USER_B);

      expect(latest).toBeNull();
    });
  });
});
