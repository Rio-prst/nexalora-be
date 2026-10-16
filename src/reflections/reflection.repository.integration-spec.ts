import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { ReflectionRepository } from './reflection.repository.js';

const USER_A = '33333333-0000-4000-8000-0000000000a1';
const USER_B = '33333333-0000-4000-8000-0000000000b2';
const MISSION_ID = 'mission-refl-fixture';

let prisma: PrismaClient;
let repository: ReflectionRepository;

async function resetReflections(): Promise<void> {
  await prisma.reflection.deleteMany({
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

  repository = new ReflectionRepository(prisma as never);

  await prisma.profile.createMany({
    data: [{ userId: USER_A }, { userId: USER_B }],
    skipDuplicates: true,
  });

  const major = await prisma.major.findFirst();

  if (!major) {
    throw new Error('Seed data is required for this integration spec');
  }

  await prisma.mission.deleteMany({ where: { id: MISSION_ID } });

  await prisma.mission.create({
    data: {
      id: MISSION_ID,
      missionVersion: 'v1',
      engineVersion: 'INF-v1',
      majorId: major.id,
      title: 'Pesanan Tanpa Tabrakan',
      configJson: { engine: 'INF-v1' },
      reviewerName: 'Curator Team',
    },
  });

  await resetReflections();
});

afterAll(async () => {
  await resetReflections();
  await prisma?.attempt.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.mission.deleteMany({ where: { id: MISSION_ID } });
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

let attemptCounter = 0;

async function seedAttempt(userId: string): Promise<string> {
  attemptCounter += 1;

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      missionId: MISSION_ID,
      missionVersion: 'v1',
      seed: `seed-${attemptCounter}`,
      idempotencyKey: `refl-attempt-${userId.slice(0, 4)}-${attemptCounter}`,
      artifactJson: { stock: 2, quantity: 1, paymentSuccess: true },
    },
    select: { id: true },
  });

  return attempt.id;
}

describe('ReflectionRepository', () => {
  describe('findOwnedAttempt', () => {
    it('reads the major through attempt and mission', async () => {
      const attemptId = await seedAttempt(USER_A);

      const owned = await repository.findOwnedAttempt(USER_A, attemptId);

      expect(owned).not.toBeNull();
      expect(owned?.majorId).toBeTruthy();
      expect(owned?.missionId).toBe(MISSION_ID);
    });

    it('returns null for an attempt owned by another account (T01)', async () => {
      const attemptId = await seedAttempt(USER_A);

      await expect(
        repository.findOwnedAttempt(USER_B, attemptId),
      ).resolves.toBeNull();
    });

    it('returns null for an attempt that does not exist', async () => {
      await expect(
        repository.findOwnedAttempt(
          USER_A,
          'dddddddd-0000-4000-8000-0000000000d4',
        ),
      ).resolves.toBeNull();
    });
  });

  describe('insert and revisions', () => {
    it('starts the first revision at one', async () => {
      const attemptId = await seedAttempt(USER_A);

      const stored = await repository.insert({
        userId: USER_A,
        attemptId,
        revision: 1,
        responses: { continueInterest: 4 },
        isActive: true,
      });

      expect(stored.revision).toBe(1);
      expect(stored.isActive).toBe(true);
      expect(stored.responses).toEqual({ continueInterest: 4 });
    });

    it('reads the highest existing revision for an attempt', async () => {
      const attemptId = await seedAttempt(USER_A);

      await repository.insert({
        userId: USER_A,
        attemptId,
        revision: 1,
        responses: { continueInterest: 1 },
        isActive: true,
      });

      await repository.insert({
        userId: USER_A,
        attemptId,
        revision: 2,
        responses: { continueInterest: 2 },
        isActive: false,
      });

      await expect(repository.findLatestRevision(attemptId)).resolves.toBe(2);
    });

    it('reports zero before any reflection exists', async () => {
      const attemptId = await seedAttempt(USER_A);

      await expect(repository.findLatestRevision(attemptId)).resolves.toBe(0);
    });
  });

  describe('deactivateOthers', () => {
    it('clears the previous active flag and leaves the rest alone', async () => {
      const attemptId = await seedAttempt(USER_A);

      const otherAttemptId = await seedAttempt(USER_A);

      const first = await repository.insert({
        userId: USER_A,
        attemptId,
        revision: 1,
        responses: { continueInterest: 3 },
        isActive: true,
      });

      const other = await repository.insert({
        userId: USER_A,
        attemptId: otherAttemptId,
        revision: 1,
        responses: { continueInterest: 5 },
        isActive: true,
      });

      await repository.deactivateOthers(USER_A, attemptId);

      const rows = await prisma.reflection.findMany({
        where: { userId: USER_A },
        select: { id: true, isActive: true },
      });

      const cleared = rows.find((row) => row.id === first.id);
      const untouched = rows.find((row) => row.id === other.id);

      expect(cleared?.isActive).toBe(false);
      expect(untouched?.isActive).toBe(true);
    });
  });
});
