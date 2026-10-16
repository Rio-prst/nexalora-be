import 'dotenv/config';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { ProfileRepository } from './profile.repository.js';

/**
 * Repository integration tests.
 *
 * These deliberately never mock PrismaService or the repository. Pointed at a
 * real PostgreSQL schema (DATABASE_URL_TEST), they are the only place where
 * constraints, cascades, and transactional behaviour are actually proven —
 * none of which a mocked test can demonstrate.
 */

const USER_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const USER_B = 'bbbbbbbb-0000-4000-8000-000000000002';

let prisma: PrismaClient;
let repository: ProfileRepository;

beforeAll(() => {
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

  repository = new ProfileRepository(prisma as never);
});

afterAll(async () => {
  await prisma?.$disconnect();
});

afterEach(async () => {
  await prisma.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
});

describe('ProfileRepository (integration)', () => {
  describe('ensureExists', () => {
    it('creates an empty profile for a brand new account', async () => {
      await repository.ensureExists(USER_A);

      const found = await repository.findByUserId(USER_A);

      expect(found).not.toBeNull();
      expect(found?.version).toBe(1);
      expect(found?.displayName).toBeNull();
      expect(found?.monthlyBudgetMax).toBeNull();
    });

    it('is idempotent and does not bump the version on a second call', async () => {
      await repository.ensureExists(USER_A);
      await repository.ensureExists(USER_A);

      const found = await repository.findByUserId(USER_A);

      expect(found?.version).toBe(1);
      expect(await prisma.profile.count({ where: { userId: USER_A } })).toBe(1);
    });
  });

  describe('findByUserId', () => {
    it('returns null for an account that has no profile', async () => {
      expect(await repository.findByUserId(USER_A)).toBeNull();
    });

    it('never returns another account data (T01)', async () => {
      await repository.ensureExists(USER_A);
      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        displayName: 'Account A',
      });

      const seenByB = await repository.findByUserId(USER_B);

      expect(seenByB).toBeNull();
    });
  });

  describe('updateWithVersion', () => {
    it('applies the change and increments the version', async () => {
      await repository.ensureExists(USER_A);

      const updated = await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        displayName: 'Nadia',
        monthlyBudgetMax: 2_800_000,
      });

      expect(updated?.version).toBe(2);
      expect(updated?.displayName).toBe('Nadia');
    });

    it('keeps null instead of coercing it to zero', async () => {
      await repository.ensureExists(USER_A);
      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        monthlyBudgetMax: 1_500_000,
      });

      const updated = await repository.updateWithVersion(USER_A, {
        expectedVersion: 2,
        monthlyBudgetMax: null,
      });

      expect(updated?.monthlyBudgetMax).toBeNull();
    });

    it('rejects a stale expectedVersion (T15)', async () => {
      await repository.ensureExists(USER_A);
      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        displayName: 'First',
      });

      const stale = await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        displayName: 'Second',
      });

      expect(stale).toBeNull();
      expect((await repository.findByUserId(USER_A))?.displayName).toBe(
        'First',
      );
    });

    it('lets exactly one of two concurrent writers win (T15)', async () => {
      await repository.ensureExists(USER_A);

      const results = await Promise.all([
        repository.updateWithVersion(USER_A, {
          expectedVersion: 1,
          displayName: 'Tab A',
        }),
        repository.updateWithVersion(USER_A, {
          expectedVersion: 1,
          displayName: 'Tab B',
        }),
      ]);

      expect(results.filter((result) => result !== null)).toHaveLength(1);
      expect((await repository.findByUserId(USER_A))?.version).toBe(2);
    });

    it('replaces the whole academic record set rather than appending', async () => {
      await repository.ensureExists(USER_A);

      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        schoolSubjects: [
          { subject: 'Matematika', semester: 4, score: 88, scale: '0-100' },
          { subject: 'Fisika', semester: 4, score: 79, scale: '0-100' },
        ],
      });

      const updated = await repository.updateWithVersion(USER_A, {
        expectedVersion: 2,
        schoolSubjects: [
          { subject: 'Matematika', semester: 5, score: 90, scale: '0-100' },
        ],
      });

      expect(updated?.schoolSubjects).toHaveLength(1);
      expect(updated?.schoolSubjects[0]).toMatchObject({
        subject: 'Matematika',
        semester: 5,
      });
    });

    it('clears academic records when an empty list is sent', async () => {
      await repository.ensureExists(USER_A);
      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        schoolSubjects: [
          { subject: 'Matematika', semester: 4, score: 88, scale: '0-100' },
        ],
      });

      const updated = await repository.updateWithVersion(USER_A, {
        expectedVersion: 2,
        schoolSubjects: [],
      });

      expect(updated?.schoolSubjects).toEqual([]);
      expect(
        await prisma.academicRecord.count({ where: { userId: USER_A } }),
      ).toBe(0);
    });

    it('records consent without touching the version guard', async () => {
      await repository.ensureExists(USER_A);

      const updated = await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        consent: { purposeVersion: 'consent-v1', isAccepted: true },
      });

      expect(updated?.consents).toHaveLength(1);
      expect(updated?.consents[0]).toMatchObject({
        purposeVersion: 'consent-v1',
        isAccepted: true,
      });
    });

    it('rolls the whole update back when a later write fails', async () => {
      await repository.ensureExists(USER_A);

      // purpose_version is varchar(40); a longer value violates the column
      // constraint and must abort the transaction rather than leave the profile
      // half-updated.
      await expect(
        repository.updateWithVersion(USER_A, {
          expectedVersion: 1,
          displayName: 'Should not persist',
          consent: {
            purposeVersion: 'x'.repeat(200),
            isAccepted: true,
          },
        }),
      ).rejects.toThrow();

      const after = await repository.findByUserId(USER_A);

      expect(after?.displayName).toBeNull();
      expect(after?.version).toBe(1);
      expect(after?.consents).toEqual([]);
    });
  });

  describe('deleteAccountData', () => {
    it('removes every private table for the account (NFR-04)', async () => {
      await repository.ensureExists(USER_A);
      await repository.updateWithVersion(USER_A, {
        expectedVersion: 1,
        displayName: 'Nadia',
        schoolSubjects: [
          { subject: 'Matematika', semester: 4, score: 88, scale: '0-100' },
        ],
        consent: { purposeVersion: 'consent-v1', isAccepted: true },
      });

      await prisma.recommendationRun.create({
        data: {
          userId: USER_A,
          profileVersion: 1,
          ruleVersion: 'heuristic-v1',
          catalogVersion: 'pilot-v1',
          inputsSnapshotJson: {},
          resultsJson: {},
        },
      });

      expect(await repository.deleteAccountData(USER_A)).toBe(true);

      expect(await prisma.profile.count({ where: { userId: USER_A } })).toBe(0);
      expect(
        await prisma.academicRecord.count({ where: { userId: USER_A } }),
      ).toBe(0);
      expect(await prisma.consent.count({ where: { userId: USER_A } })).toBe(0);
      expect(
        await prisma.recommendationRun.count({ where: { userId: USER_A } }),
      ).toBe(0);
    });

    it('reports nothing removed for an unknown account', async () => {
      expect(await repository.deleteAccountData(USER_A)).toBe(false);
    });

    it('leaves other accounts untouched', async () => {
      await repository.ensureExists(USER_A);
      await repository.ensureExists(USER_B);

      await repository.deleteAccountData(USER_A);

      expect(await repository.findByUserId(USER_B)).not.toBeNull();
    });
  });
});
