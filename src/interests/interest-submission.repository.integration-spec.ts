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
import { InterestSubmissionRepository } from './interest-submission.repository.js';
import type { InterestAnswer } from './dto/interest-answer.dto.js';

const USER_A = 'aaaaaaaa-0000-4000-8000-000000000011';
const USER_B = 'bbbbbbbb-0000-4000-8000-000000000012';

const ANSWERS: InterestAnswer[] = [
  { itemId: 'q1', dimension: 'LOGIC_SYSTEM', state: 'ANSWERED', value: 5 },
  { itemId: 'q2', dimension: 'LOGIC_SYSTEM', state: 'UNKNOWN', value: null },
];

let prisma: PrismaClient;
let repository: InterestSubmissionRepository;

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

  repository = new InterestSubmissionRepository(prisma as never);

  await prisma.profile.createMany({
    data: [{ userId: USER_A }, { userId: USER_B }],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

afterEach(async () => {
  await prisma.interestSubmission.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
});

describe('InterestSubmissionRepository (integration)', () => {
  it('stores a submission for the given account', async () => {
    const created = await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.instrumentVersion).toBe('v0.1');
    expect(created.submittedAt).toBeInstanceOf(Date);
  });

  it('persists a null answer as null rather than zero (AC-02A)', async () => {
    const created = await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });

    const row = await prisma.interestSubmission.findUniqueOrThrow({
      where: { id: created.id },
    });

    expect(row.answersJson).toEqual(ANSWERS);
    const stored = row.answersJson as unknown as typeof ANSWERS;
    expect(stored[1].value).toBeNull();
  });

  it('keeps submissions immutable by appending rather than replacing', async () => {
    await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });
    await repository.create(USER_A, {
      instrumentVersion: 'v0.2',
      answers: ANSWERS,
    });

    expect(
      await prisma.interestSubmission.count({ where: { userId: USER_A } }),
    ).toBe(2);
  });

  it('scopes rows to the owning account (T01)', async () => {
    await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });

    expect(
      await prisma.interestSubmission.count({ where: { userId: USER_B } }),
    ).toBe(0);
  });

  it('orders submissions by submission time for one account', async () => {
    const first = await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });
    const second = await repository.create(USER_A, {
      instrumentVersion: 'v0.2',
      answers: ANSWERS,
    });

    const rows = await prisma.interestSubmission.findMany({
      where: { userId: USER_A },
      orderBy: { submittedAt: 'asc' },
      select: { id: true },
    });

    expect(rows.map((row) => row.id)).toEqual([first.id, second.id]);
    expect(first.id).not.toBe(second.id);
  });

  it('removes submissions when the account data is deleted (NFR-04)', async () => {
    await repository.create(USER_A, {
      instrumentVersion: 'v0.1',
      answers: ANSWERS,
    });

    await prisma.profile.deleteMany({ where: { userId: USER_A } });

    expect(
      await prisma.interestSubmission.count({ where: { userId: USER_A } }),
    ).toBe(0);

    await prisma.profile.create({ data: { userId: USER_A } });
  });

  it('refuses to store a submission for an account with no profile row', async () => {
    await prisma.profile.deleteMany({ where: { userId: USER_A } });

    await expect(
      repository.create(USER_A, {
        instrumentVersion: 'v0.1',
        answers: ANSWERS,
      }),
    ).rejects.toThrow();
  });
});
