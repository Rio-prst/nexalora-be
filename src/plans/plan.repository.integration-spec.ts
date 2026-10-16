import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PlanRepository } from './plan.repository.js';
import type { NewTask } from './interfaces/plan.repository.interface.js';

const USER_A = '11111111-0000-4000-8000-0000000000a1';
const USER_B = '11111111-0000-4000-8000-0000000000b2';

let prisma: PrismaClient;
let repository: PlanRepository;

const TASKS: NewTask[] = [
  {
    key: 'task-1',
    title: 'Read the curriculum',
    actionType: 'READ_CURRICULUM',
    estimatedMinutes: 45,
    dueDate: '2026-10-18',
    prerequisiteKey: null,
  },
  {
    key: 'task-2',
    title: 'Try a short activity',
    actionType: 'EXPLORE_MAJOR',
    estimatedMinutes: 60,
    dueDate: '2026-10-23',
    prerequisiteKey: 'task-1',
  },
];

async function resetPlans(): Promise<void> {
  await prisma.plan.deleteMany({
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

  repository = new PlanRepository(prisma as never);

  await prisma.profile.createMany({
    data: [{ userId: USER_A }, { userId: USER_B }],
    skipDuplicates: true,
  });

  await resetPlans();
});

afterAll(async () => {
  await resetPlans();
  await prisma?.profile.deleteMany({
    where: { userId: { in: [USER_A, USER_B] } },
  });
  await prisma?.$disconnect();
});

let seedCounter = 0;

async function seedActivePlan(prefix: string) {
  seedCounter += 1;

  await repository.archiveActive(USER_A);

  const plan = await repository.insertPlan(
    {
      userId: USER_A,
      goalIds: [],
      weeklyMinutes: 180,
      startDate: '2026-10-16',
      version: 100 + seedCounter,
      status: 'ACTIVE',
      idempotencyKey: `${prefix}-${seedCounter}`,
    },
    TASKS,
  );

  const active = await repository.findActive(USER_A);

  if (!active) throw new Error('Seeded plan was not returned as active');

  return active;
}

describe('PlanRepository', () => {
  describe('insertPlan', () => {
    it('resolves a prerequisite key into a real task id', async () => {
      const plan = await repository.insertPlan(
        {
          userId: USER_A,
          goalIds: [],
          weeklyMinutes: 180,
          startDate: '2026-10-16',
          version: 1,
          status: 'ACTIVE',
          idempotencyKey: 'plan-idem-1',
        },
        TASKS,
      );

      const first = plan.tasks.find(
        (task) => task.title === 'Read the curriculum',
      );
      const second = plan.tasks.find(
        (task) => task.title === 'Try a short activity',
      );

      expect(first?.id).toBeTruthy();
      expect(second?.prerequisiteTaskId).toBe(first?.id);
      expect(second?.prerequisiteTaskId).not.toBeNull();
    });

    it('stores the goal list and the start date', async () => {
      const plan = await repository.insertPlan(
        {
          userId: USER_A,
          goalIds: ['career-1', 'career-2'],
          weeklyMinutes: 120,
          startDate: '2026-10-16',
          version: 2,
          status: 'ACTIVE',
          idempotencyKey: 'plan-idem-2',
        },
        [TASKS[0]],
      );

      expect(plan.goalIds).toEqual(['career-1', 'career-2']);
      expect(plan.startDate).toBe('2026-10-16');
      expect(plan.weeklyMinutes).toBe(120);
    });

    it('orders tasks by due date when reading back', async () => {
      const plan = await repository.insertPlan(
        {
          userId: USER_A,
          goalIds: [],
          weeklyMinutes: 180,
          startDate: '2026-11-01',
          version: 3,
          status: 'ACTIVE',
          idempotencyKey: 'plan-idem-3',
        },
        [
          { ...TASKS[0], dueDate: '2026-11-20' },
          {
            ...TASKS[0],
            key: 'task-x',
            title: 'Earlier',
            dueDate: '2026-11-05',
          },
        ],
      );

      expect(plan.tasks[0]?.title).toBe('Earlier');
    });
  });

  describe('findActive', () => {
    it('never returns another account plan (T01)', async () => {
      await repository.archiveActive(USER_A);

      await expect(repository.findActive(USER_B)).resolves.toBeNull();
    });
  });

  describe('latestVersion', () => {
    it('reads the highest stored version', async () => {
      const version = await repository.latestVersion(USER_A);

      expect(version).toBeGreaterThanOrEqual(3);
    });
  });

  describe('updateTask', () => {
    it('advances the task version on a matching expectedVersion', async () => {
      const active = await seedActivePlan('ut-1');

      const task = active.tasks[0];

      if (!task) throw new Error('Fixture plan produced no tasks');

      const updated = await repository.updateTask(
        USER_A,
        task.id,
        task.version,
        { status: 'DONE', evidenceNote: 'Finished the checklist' },
      );

      expect(updated?.version).toBe(task.version + 1);
      expect(updated?.status).toBe('DONE');
    });

    it('refuses a stale expectedVersion (T15)', async () => {
      const active = await seedActivePlan('ut-2');
      const task = active.tasks[0];

      if (!task) throw new Error('Fixture plan produced no tasks');

      await expect(
        repository.updateTask(USER_A, task.id, 0, { status: 'DONE' }),
      ).resolves.toBeNull();
    });

    it('never updates a task owned by another account (T01)', async () => {
      const active = await seedActivePlan('ut-3');
      const task = active.tasks[0];

      if (!task) throw new Error('Fixture plan produced no tasks');

      await expect(
        repository.updateTask(USER_B, task.id, task.version, {
          status: 'DONE',
        }),
      ).resolves.toBeNull();
    });
  });

  describe('countDoneTasks', () => {
    it('counts nothing while every task is still TODO', async () => {
      const active = await seedActivePlan('done-0');

      const done = await repository.countDoneTasks(active.id);

      expect(done).toBe(0);
    });

    it('counts only the tasks already marked DONE', async () => {
      const active = await seedActivePlan('done-1');
      const target = active.tasks[1];

      if (!target) throw new Error('Fixture plan produced no second task');

      await repository.updateTask(USER_A, target.id, target.version, {
        status: 'DONE',
      });

      const done = await repository.countDoneTasks(active.id);

      expect(done).toBe(1);
      expect(done).toBeLessThanOrEqual(active.tasks.length);
    });
  });
});
