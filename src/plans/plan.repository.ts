import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type { TaskStatus } from './plan.constants.js';
import type {
  IPlanRepository,
  NewPlan,
  NewTask,
  PlanSnapshot,
  PlanTaskSnapshot,
} from './interfaces/plan.repository.interface.js';

function taskSnapshot(row: {
  id: string;
  title: string;
  actionType: string;
  estimatedMinutes: number;
  dueDate: Date;
  status: string;
  prerequisiteTaskId: string | null;
  evidenceNote: string | null;
  evidenceUrl: string | null;
  version: number;
}): PlanTaskSnapshot {
  return {
    id: row.id,
    title: row.title,
    actionType: row.actionType,
    estimatedMinutes: row.estimatedMinutes,
    dueDate: row.dueDate.toISOString().slice(0, 10),
    status: row.status as TaskStatus,
    prerequisiteTaskId: row.prerequisiteTaskId,
    evidenceNote: row.evidenceNote,
    evidenceUrl: row.evidenceUrl,
    version: row.version,
  };
}

const TASK_SELECT = {
  id: true,
  title: true,
  actionType: true,
  estimatedMinutes: true,
  dueDate: true,
  status: true,
  prerequisiteTaskId: true,
  evidenceNote: true,
  evidenceUrl: true,
  version: true,
} as const;

@Injectable()
export class PlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<PlanSnapshot | null> {
    const row = await this.prisma.plan.findFirst({
      where: { userId, idempotencyKey },
      select: {
        id: true,
        goalIdsJson: true,
        weeklyMinutes: true,
        startDate: true,
        version: true,
        status: true,
        createdAt: true,
        tasks: { select: TASK_SELECT, orderBy: { dueDate: 'asc' } },
      },
    });

    return row ? this.snapshot(row) : null;
  }

  async archiveActive(userId: string): Promise<void> {
    await this.prisma.plan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
  }

  async latestVersion(userId: string): Promise<number> {
    const rows = await this.prisma.plan.findMany({
      where: { userId },
      select: { version: true },
      orderBy: { version: 'desc' },
      take: 1,
    });

    return rows[0]?.version ?? 0;
  }

  async insertPlan(
    plan: NewPlan,
    tasks: readonly NewTask[],
  ): Promise<PlanSnapshot> {
    const created = await this.prisma.plan.create({
      data: {
        userId: plan.userId,
        goalIdsJson: plan.goalIds,
        weeklyMinutes: plan.weeklyMinutes,
        startDate: new Date(`${plan.startDate}T00:00:00.000Z`),
        version: plan.version,
        status: plan.status,
        idempotencyKey: plan.idempotencyKey,
      },
      select: { id: true },
    });

    const byKey = new Map<string, string>();

    for (const task of tasks) {
      const prerequisiteId =
        task.prerequisiteKey === null
          ? null
          : (byKey.get(task.prerequisiteKey) ?? null);

      const row = await this.prisma.task.create({
        data: {
          planId: created.id,
          prerequisiteTaskId: prerequisiteId,
          title: task.title,
          actionType: task.actionType,
          estimatedMinutes: task.estimatedMinutes,
          dueDate: new Date(`${task.dueDate}T00:00:00.000Z`),
        },
        select: { id: true },
      });

      byKey.set(task.key, row.id);
    }

    const stored = await this.prisma.plan.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        goalIdsJson: true,
        weeklyMinutes: true,
        startDate: true,
        version: true,
        status: true,
        createdAt: true,
        tasks: { select: TASK_SELECT, orderBy: { dueDate: 'asc' } },
      },
    });

    if (!stored) {
      throw new Error('Plan vanished immediately after creation');
    }

    return this.snapshot(stored);
  }

  async findActive(userId: string): Promise<PlanSnapshot | null> {
    const row = await this.prisma.plan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        goalIdsJson: true,
        weeklyMinutes: true,
        startDate: true,
        version: true,
        status: true,
        createdAt: true,
        tasks: { select: TASK_SELECT, orderBy: { dueDate: 'asc' } },
      },
    });

    return row ? this.snapshot(row) : null;
  }

  async findOwnedTask(
    userId: string,
    taskId: string,
  ): Promise<PlanTaskSnapshot | null> {
    const row = await this.prisma.task.findFirst({
      where: { id: taskId, plan: { userId } },
      select: TASK_SELECT,
    });

    return row ? taskSnapshot(row) : null;
  }

  async updateTask(
    userId: string,
    taskId: string,
    expectedVersion: number,
    patch: {
      status?: TaskStatus;
      dueDate?: string;
      evidenceNote?: string | null;
      evidenceUrl?: string | null;
    },
  ): Promise<PlanTaskSnapshot | null> {
    const updated = await this.prisma.task.updateMany({
      where: { id: taskId, version: expectedVersion, plan: { userId } },
      data: {
        ...(patch.status === undefined ? {} : { status: patch.status }),
        ...(patch.dueDate === undefined
          ? {}
          : { dueDate: new Date(`${patch.dueDate}T00:00:00.000Z`) }),
        ...(patch.evidenceNote === undefined
          ? {}
          : { evidenceNote: patch.evidenceNote }),
        ...(patch.evidenceUrl === undefined
          ? {}
          : { evidenceUrl: patch.evidenceUrl }),
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) return null;

    return this.findOwnedTask(userId, taskId);
  }

  async countDoneTasks(planId: string): Promise<number> {
    return this.prisma.task.count({
      where: { planId, status: 'DONE' },
    });
  }

  private snapshot(row: {
    id: string;
    goalIdsJson: unknown;
    weeklyMinutes: number;
    startDate: Date;
    version: number;
    status: string;
    createdAt: Date;
    tasks: Array<Parameters<typeof taskSnapshot>[0]>;
  }): PlanSnapshot {
    const goalIds = Array.isArray(row.goalIdsJson)
      ? row.goalIdsJson.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [];

    return {
      id: row.id,
      goalIds,
      weeklyMinutes: row.weeklyMinutes,
      startDate: row.startDate.toISOString().slice(0, 10),
      version: row.version,
      status: row.status,
      tasks: row.tasks.map(taskSnapshot),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
