import type { TaskStatus } from '../plan.constants.js';

export type PlanTaskSnapshot = {
  id: string;
  title: string;
  actionType: string;
  estimatedMinutes: number;
  dueDate: string;
  status: TaskStatus;
  prerequisiteTaskId: string | null;
  evidenceNote: string | null;
  evidenceUrl: string | null;
  version: number;
};

export type PlanSnapshot = {
  id: string;
  goalIds: string[];
  weeklyMinutes: number;
  startDate: string;
  version: number;
  status: string;
  tasks: PlanTaskSnapshot[];
  createdAt: string;
};

export type NewPlan = {
  userId: string;
  goalIds: string[];
  weeklyMinutes: number;
  startDate: string;
  version: number;
  status: 'ACTIVE';
  idempotencyKey: string;
};

export type NewTask = {
  key: string;
  title: string;
  actionType: string;
  estimatedMinutes: number;
  dueDate: string;
  prerequisiteKey: string | null;
};

export interface IPlanRepository {
  findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<PlanSnapshot | null>;
  archiveActive(userId: string): Promise<void>;
  latestVersion(userId: string): Promise<number>;
  insertPlan(plan: NewPlan, tasks: readonly NewTask[]): Promise<PlanSnapshot>;
  findActive(userId: string): Promise<PlanSnapshot | null>;
  findOwnedTask(
    userId: string,
    taskId: string,
  ): Promise<PlanTaskSnapshot | null>;
  updateTask(
    userId: string,
    taskId: string,
    expectedVersion: number,
    patch: {
      status?: TaskStatus;
      dueDate?: string;
      evidenceNote?: string | null;
      evidenceUrl?: string | null;
    },
  ): Promise<PlanTaskSnapshot | null>;
  countDoneTasks(planId: string): Promise<number>;
}

export const IPlanRepository = Symbol('IPlanRepository');
