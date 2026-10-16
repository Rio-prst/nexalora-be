import { z } from 'zod';
import { MIN_PLAN_TASKS } from '../plan.constants.js';

export const PreviewPlanSchema = z
  .object({
    goalIds: z.array(z.string().min(1).max(80)).max(20).default([]),
    weeklyMinutes: z.number().int().min(30).max(2000).default(180),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export const ActivatePlanSchema = z
  .object({
    goalIds: z.array(z.string().min(1).max(80)).max(20).default([]),
    weeklyMinutes: z.number().int().min(30).max(2000).default(180),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    basePlanVersion: z.number().int().positive().optional(),
  })
  .strict();

export const UpdateTaskSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(['TODO', 'DOING', 'DONE', 'SKIPPED']).optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    evidenceNote: z.string().max(2000).nullable().optional(),
    evidenceUrl: z.string().url().max(2000).nullable().optional(),
  })
  .strict();

export type PreviewPlanDto = z.infer<typeof PreviewPlanSchema>;
export type ActivatePlanDto = z.infer<typeof ActivatePlanSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;

export { MIN_PLAN_TASKS };
