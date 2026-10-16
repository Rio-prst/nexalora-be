import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { AttemptRepository } from './attempt.repository.js';

const USER_A = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const USER_B = 'bbbbbbbb-0000-4000-8000-0000000000b2';
const MISSION_ID = 'mission-inf-fixture';

let prisma: PrismaClient;
let repository: AttemptRepository;

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

  repository = new AttemptRepository(prisma as never);

  await prisma.profile.createMany({
    data: [{ userId: USER_A }, { userId: USER_B }],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma?.attempt.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.mission.deleteMany({ where: { id: MISSION_ID } });
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

describe('AttemptRepository', () => {
  it('returns null for a mission that does not exist', async () => {
    await expect(repository.findMission('missing-mission')).resolves.toBeNull();
  });

  it('stores an attempt and reads it back for its owner', async () => {
    const mission = await prisma.mission.findFirst({
      where: { id: MISSION_ID },
    });

    if (!mission) {
      const major = await prisma.major.findFirst();

      if (!major) {
        throw new Error('Seed data is required for this integration spec');
      }

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
    }

    const created = await repository.insert({
      userId: USER_A,
      missionId: MISSION_ID,
      missionVersion: 'v1',
      seed: 'seed-1',
      idempotencyKey: 'idem-1',
      draftArtifact: { stock: 2, quantity: 1, paymentSuccess: true },
    });

    expect(created.revision).toBe(0);
    expect(created.status).toBe('DRAFT');

    const found = await repository.findOwned(USER_A, created.id);

    expect(found?.id).toBe(created.id);
  });

  it('never returns another account attempt (T01)', async () => {
    const row = await prisma.attempt.findFirst({
      where: { userId: USER_A },
      select: { id: true },
    });

    if (!row) throw new Error('Fixture attempt was not created');

    await expect(repository.findOwned(USER_B, row.id)).resolves.toBeNull();
  });

  it('returns the same attempt for a replayed Idempotency-Key (T15)', async () => {
    const replay = await repository.findByIdempotencyKey(USER_A, 'idem-1');

    expect(replay).not.toBeNull();
    expect(replay?.missionId).toBe(MISSION_ID);
  });

  it('refuses a draft save against a stale revision (T15)', async () => {
    const row = await prisma.attempt.findFirst({
      where: { userId: USER_A },
      select: { id: true, revision: true },
    });

    if (!row) throw new Error('Fixture attempt was not created');

    const updated = await repository.saveDraft(USER_A, row.id, row.revision, {
      stock: 1,
    });

    expect(updated?.revision).toBe(row.revision + 1);

    await expect(
      repository.saveDraft(USER_A, row.id, row.revision, { stock: 2 }),
    ).resolves.toBeNull();
  });
});
