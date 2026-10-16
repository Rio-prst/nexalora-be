import { z } from 'zod';

export const CreateAttemptSchema = z
  .object({
    missionId: z.string().min(1).max(80),
    seed: z.string().min(1).max(64),
    draftArtifact: z.unknown().optional(),
  })
  .strict();

export const UpdateAttemptSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    draftArtifact: z.unknown().optional(),
  })
  .strict();

export const RunAttemptSchema = z
  .object({
    scenarioId: z.string().min(1).max(60),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();

export type CreateAttemptDto = z.infer<typeof CreateAttemptSchema>;
export type UpdateAttemptDto = z.infer<typeof UpdateAttemptSchema>;
export type RunAttemptDto = z.infer<typeof RunAttemptSchema>;
