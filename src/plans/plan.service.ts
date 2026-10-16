import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import type {
  ActivatePlanDto,
  PreviewPlanDto,
  UpdateTaskDto,
} from './dto/plan.dto.js';
import { buildPlanDraft, hasPrerequisiteCycle } from './plan-generator.js';
import { MIN_PLAN_TASKS, type PlanDraft } from './plan.constants.js';
import { IPlanRepository } from './interfaces/plan.repository.interface.js';
import type {
  NewTask,
  PlanSnapshot,
  PlanTaskSnapshot,
} from './interfaces/plan.repository.interface.js';
import type { IPlanService } from './interfaces/plan.service.interface.js';

function parseStartDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

@Injectable()
export class PlanService implements IPlanService {
  constructor(
    @Inject(IPlanRepository) private readonly repository: IPlanRepository,
  ) {}

  preview(input: PreviewPlanDto): Promise<PlanDraft> {
    const draft = buildPlanDraft(
      parseStartDate(input.startDate),
      input.weeklyMinutes,
      input.goalIds,
    );

    if (draft.tasks.length < MIN_PLAN_TASKS) {
      throw notFound('Generator produced fewer than the minimum tasks');
    }

    return Promise.resolve(draft);
  }

  async activate(
    userId: string,
    idempotencyKey: string,
    input: ActivatePlanDto,
  ): Promise<{ plan: PlanSnapshot; replayed: boolean }> {
    const replay = await this.repository.findByIdempotencyKey(
      userId,
      idempotencyKey,
    );

    if (replay) {
      return { plan: replay, replayed: true };
    }

    const draft = buildPlanDraft(
      parseStartDate(input.startDate),
      input.weeklyMinutes,
      input.goalIds,
    );

    if (hasPrerequisiteCycle(draft.tasks)) {
      throw notFound('Generated prerequisites form a cycle');
    }

    const doneTasks = await this.repository.countDoneTasks(
      await this.resolveCurrentPlanId(userId),
    );

    const latest = await this.repository.latestVersion(userId);

    const version =
      doneTasks > 0 || latest > 0 || input.basePlanVersion !== undefined
        ? latest + 1
        : 1;

    await this.repository.archiveActive(userId);

    const tasks: NewTask[] = draft.tasks.map((task) => ({
      key: task.key,
      title: task.title,
      actionType: task.actionType,
      estimatedMinutes: task.estimatedMinutes,
      dueDate: task.dueDate,
      prerequisiteKey: task.prerequisiteKey,
    }));

    const plan = await this.repository.insertPlan(
      {
        userId,
        goalIds: draft.goalIds,
        weeklyMinutes: draft.weeklyMinutes,
        startDate: draft.startDate,
        version,
        status: 'ACTIVE',
        idempotencyKey,
      },
      tasks,
    );

    return { plan, replayed: false };
  }

  async active(userId: string): Promise<PlanSnapshot> {
    const plan = await this.repository.findActive(userId);

    if (!plan) {
      throw notFound('No active plan');
    }

    return plan;
  }

  async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<PlanTaskSnapshot> {
    const task = await this.repository.findOwnedTask(userId, taskId);

    if (!task) {
      throw notFound('Task not found');
    }

    if (task.version !== input.expectedVersion) {
      throw versionConflict(input.expectedVersion, task.version);
    }

    const updated = await this.repository.updateTask(
      userId,
      taskId,
      input.expectedVersion,
      {
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
        ...(input.evidenceNote === undefined
          ? {}
          : { evidenceNote: input.evidenceNote }),
        ...(input.evidenceUrl === undefined
          ? {}
          : { evidenceUrl: input.evidenceUrl }),
      },
    );

    if (!updated) {
      const current = await this.repository.findOwnedTask(userId, taskId);
      throw versionConflict(
        input.expectedVersion,
        current?.version ?? task.version,
      );
    }

    return updated;
  }

  private async resolveCurrentPlanId(userId: string): Promise<string> {
    const active = await this.repository.findActive(userId);
    return active?.id ?? '';
  }
}
