import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PassportRepository } from './passport.repository.js';
import { redactSnapshot } from './interfaces/passport.repository.interface.js';
import type { PassportSource } from './interfaces/passport.repository.interface.js';

const USER_A = '22222222-0000-4000-8000-0000000000a1';
const USER_B = '22222222-0000-4000-8000-0000000000b2';

let prisma: PrismaClient;
let repository: PassportRepository;

async function resetPassports(): Promise<void> {
  await prisma.passport.deleteMany({
    where: { ownerId: { in: [USER_A, USER_B] } },
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

  repository = new PassportRepository(prisma as never);

  await prisma.profile.createMany({
    data: [
      {
        userId: USER_A,
        displayName: 'Siti',
        gradeLevel: 'XII',
        monthlyBudgetMax: 3_000_000,
        upfrontBudgetMax: 5_000_000,
      },
      { userId: USER_B, displayName: 'Budi' },
    ],
    skipDuplicates: true,
  });

  await prisma.academicRecord.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });

  await prisma.academicRecord.create({
    data: {
      userId: USER_A,
      subject: 'Matematika',
      semester: 1,
      score: 88,
      scale: '0-100',
    },
  });

  await resetPassports();
});

afterAll(async () => {
  await resetPassports();
  await prisma?.academicRecord.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

async function loadSourceOrFail(userId: string): Promise<PassportSource> {
  const source = await repository.loadSources(userId);

  if (!source) {
    throw new Error('Fixture profile was not created');
  }

  return source;
}

describe('PassportRepository', () => {
  describe('loadSources', () => {
    it('returns null for an account without a profile row', async () => {
      await expect(
        repository.loadSources('cccccccc-0000-4000-8000-0000000000c3'),
      ).resolves.toBeNull();
    });

    it('loads grades and budget that the redactor will strip', async () => {
      const source = await repository.loadSources(USER_A);

      expect(source?.academicRecords).toHaveLength(1);
      expect(source?.budget['monthlyBudgetMax']).toBe(3_000_000);
    });

    it('tolerates an account with no optional rows', async () => {
      const source = await repository.loadSources(USER_B);

      expect(source?.profile['displayName']).toBe('Budi');
      expect(source?.academicRecords).toEqual([]);
      expect(source?.budget['monthlyBudgetMax']).toBeNull();
    });

    it('leaves absent relations as null rather than failing', async () => {
      const source = await repository.loadSources(USER_B);

      expect(source?.interests).toBeNull();
      expect(source?.recommendations).toBeNull();
      expect(source?.plans).toBeNull();
    });
  });

  describe('insert and findOwned', () => {
    it('round trips an unredacted snapshot', async () => {
      const created = await repository.insert({
        ownerId: USER_A,
        snapshot: { profile: { displayName: 'Siti' } },
        redactions: [],
      });

      const found = await repository.findOwned(USER_A, created.id);

      expect(found?.snapshot['profile']).toEqual({ displayName: 'Siti' });
      expect(found?.redactions).toEqual([]);
    });

    it('never returns another account passport (T01)', async () => {
      const created = await repository.insert({
        ownerId: USER_A,
        snapshot: { profile: {} },
        redactions: ['budget'],
      });

      await expect(
        repository.findOwned(USER_B, created.id),
      ).resolves.toBeNull();
    });

    it('stores the redaction list alongside the snapshot', async () => {
      const created = await repository.insert({
        ownerId: USER_A,
        snapshot: { profile: {} },
        redactions: ['academicRecords', 'budget', 'reflections'],
      });

      const found = await repository.findOwned(USER_A, created.id);

      expect(found?.redactions).toEqual([
        'academicRecords',
        'budget',
        'reflections',
      ]);
    });
  });

  describe('redactSnapshot', () => {
    it('removes grades, budget, and reflections from the stored payload (T14)', async () => {
      const source = await loadSourceOrFail(USER_A);

      const { snapshot, redactions } = redactSnapshot(source, []);

      expect('academicRecords' in snapshot).toBe(false);
      expect('budget' in snapshot).toBe(false);
      expect('reflections' in snapshot).toBe(false);
      expect(redactions).toEqual(['academicRecords', 'budget', 'reflections']);
      expect(JSON.stringify(snapshot)).not.toContain('Matematika');
      expect(JSON.stringify(snapshot)).not.toContain('3000000');
    });

    it('includes an explicitly requested section', async () => {
      const source = await loadSourceOrFail(USER_A);

      const { snapshot } = redactSnapshot(source, ['academicRecords']);

      expect(snapshot['academicRecords']).toHaveLength(1);
      expect('budget' in snapshot).toBe(false);
    });
  });
});
