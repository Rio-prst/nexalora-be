import { describe, expect, it, jest } from '@jest/globals';
import { PlanService } from './plan.service.js';
import type {
  IPlanRepository,
  PlanSnapshot,
  PlanTaskSnapshot,
} from './interfaces/plan.repository.interface.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const TASK_ID = '33333333-0000-4000-8000-000000000003';

const PLAN: PlanSnapshot = {
  id: '44444444-0000-4000-8000-000000000004',
  goalIds: [],
  weeklyMinutes: 180,
  startDate: '2026-10-16',
  version: 1,
  status: 'ACTIVE',
  tasks: [],
  createdAt: '2026-10-16T08:00:00.000Z',
};

const TASK: PlanTaskSnapshot = {
  id: TASK_ID,
  title: 'Read the curriculum',
  actionType: 'READ_CURRICULUM',
  estimatedMinutes: 45,
  dueDate: '2026-10-18',
  status: 'TODO',
  prerequisiteTaskId: null,
  evidenceNote: null,
  evidenceUrl: null,
  version: 1,
};

function build() {
  const findByIdempotencyKey = jest.fn<
    (userId: string, key: string) => Promise<PlanSnapshot | null>
  >(() => Promise.resolve(null));
  const archiveActive = jest.fn<(userId: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const latestVersion = jest.fn<(userId: string) => Promise<number>>(() =>
    Promise.resolve(0),
  );
  const insertPlan = jest.fn<
    (plan: unknown, tasks: unknown) => Promise<PlanSnapshot>
  >(() => Promise.resolve(PLAN));
  const findActive = jest.fn<(userId: string) => Promise<PlanSnapshot | null>>(
    () => Promise.resolve(PLAN),
  );
  const findOwnedTask = jest.fn<
    (userId: string, taskId: string) => Promise<PlanTaskSnapshot | null>
  >(() => Promise.resolve(TASK));
  const updateTask = jest.fn<
    (
      userId: string,
      taskId: string,
      version: number,
      patch: unknown,
    ) => Promise<PlanTaskSnapshot | null>
  >(() => Promise.resolve({ ...TASK, version: 2 }));
  const countDoneTasks = jest.fn<(planId: string) => Promise<number>>(() =>
    Promise.resolve(0),
  );

  const repository = {
    findByIdempotencyKey,
    archiveActive,
    latestVersion,
    insertPlan,
    findActive,
    findOwnedTask,
    updateTask,
    countDoneTasks,
  } as unknown as IPlanRepository;

  return {
    service: new PlanService(repository),
    findByIdempotencyKey,
    archiveActive,
    latestVersion,
    insertPlan,
    findActive,
    findOwnedTask,
    updateTask,
    countDoneTasks,
  };
}

describe('PlanService', () => {
  describe('preview', () => {
    it('stores nothing while previewing', async () => {
      const { service, insertPlan } = build();

      const draft = await service.preview({
        goalIds: [],
        weeklyMinutes: 180,
        startDate: '2026-10-16',
      });

      expect(draft.tasks.length).toBeGreaterThanOrEqual(3);
      expect(insertPlan).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('replays the same plan for a repeated Idempotency-Key (T15)', async () => {
      const { service, insertPlan, findByIdempotencyKey } = build();
      findByIdempotencyKey.mockResolvedValue(PLAN);

      const result = await service.activate(USER_ID, 'idem-1', {
        goalIds: [],
        weeklyMinutes: 180,
        startDate: '2026-10-16',
      });

      expect(result.replayed).toBe(true);
      expect(insertPlan).not.toHaveBeenCalled();
    });

    it('archives the previous active plan before storing a new one', async () => {
      const { service, archiveActive, insertPlan } = build();

      await service.activate(USER_ID, 'idem-1', {
        goalIds: [],
        weeklyMinutes: 180,
        startDate: '2026-10-16',
      });

      expect(archiveActive).toHaveBeenCalledWith(USER_ID);
      expect(insertPlan).toHaveBeenCalled();
    });

    it('raises the version when tasks are already done (AC-08E, T13)', async () => {
      const { service, latestVersion, insertPlan } = build();
      latestVersion.mockResolvedValue(2);

      await service.activate(USER_ID, 'idem-2', {
        goalIds: ['career-1'],
        weeklyMinutes: 180,
        startDate: '2026-10-16',
      });

      const plan = insertPlan.mock.calls[0]?.[0] as { version: number };

      expect(plan.version).toBe(3);
    });

    it('passes prerequisite keys through to the repository', async () => {
      const { service, insertPlan } = build();

      await service.activate(USER_ID, 'idem-1', {
        goalIds: [],
        weeklyMinutes: 180,
        startDate: '2026-10-16',
      });

      const tasks = insertPlan.mock.calls[0]?.[1] as Array<{
        key: string;
        prerequisiteKey: string | null;
      }>;

      expect(tasks[0]?.prerequisiteKey).toBeNull();
      expect(tasks[1]?.prerequisiteKey).toBe(tasks[0]?.key);
    });
  });

  describe('active', () => {
    it('reports not found before a plan is activated', async () => {
      const { service, findActive } = build();
      findActive.mockResolvedValue(null);

      await expect(service.active(USER_ID)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('updateTask', () => {
    it('advances the task version on a matching expectedVersion', async () => {
      const { service, updateTask } = build();

      const result = await service.updateTask(USER_ID, TASK_ID, {
        expectedVersion: 1,
        status: 'DONE',
        evidenceNote: 'Finished the checklist',
      });

      expect(updateTask).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });

    it('raises a version conflict on a stale expectedVersion (T15)', async () => {
      const { service, updateTask } = build();

      await expect(
        service.updateTask(USER_ID, TASK_ID, {
          expectedVersion: 9,
          status: 'DONE',
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });

      expect(updateTask).not.toHaveBeenCalled();
    });

    it('refuses a task owned by another account (T01)', async () => {
      const { service, findOwnedTask } = build();
      findOwnedTask.mockResolvedValue(null);

      await expect(
        service.updateTask('bbbbbbbb-0000-4000-8000-0000000000b2', TASK_ID, {
          expectedVersion: 1,
          status: 'DONE',
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('keeps a completed task when its evidence is updated', async () => {
      const { service, updateTask } = build();

      await service.updateTask(USER_ID, TASK_ID, {
        expectedVersion: 1,
        evidenceUrl: 'https://example.test/evidence.png',
      });

      const patch = updateTask.mock.calls[0]?.[3] as {
        status?: string;
        evidenceUrl?: string;
      };

      expect(patch.status).toBeUndefined();
      expect(patch.evidenceUrl).toBe('https://example.test/evidence.png');
    });
  });
});
