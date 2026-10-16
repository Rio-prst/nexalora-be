import type {
  ActivatePlanDto,
  PreviewPlanDto,
  UpdateTaskDto,
} from '../dto/plan.dto.js';
import type { PlanDraft } from '../plan.constants.js';
import type {
  PlanSnapshot,
  PlanTaskSnapshot,
} from './plan.repository.interface.js';

export interface IPlanService {
  preview(input: PreviewPlanDto): Promise<PlanDraft>;
  activate(
    userId: string,
    idempotencyKey: string,
    input: ActivatePlanDto,
  ): Promise<{ plan: PlanSnapshot; replayed: boolean }>;
  active(userId: string): Promise<PlanSnapshot>;
  updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<PlanTaskSnapshot>;
}

export const IPlanService = Symbol('IPlanService');
