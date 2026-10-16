import { z } from 'zod';

export const REFLECTION_ROUTES = {
  base: 'reflections',
} as const;

export const CreateReflectionSchema = z
  .object({
    attemptId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative().optional(),
    responses: z
      .object({
        continueInterest: z.number().int().min(1).max(5).nullable(),
        expectationChange: z
          .enum(['MATCHED', 'CHANGED', 'UNKNOWN'])
          .nullable()
          .default(null),
        obstacles: z
          .array(
            z.enum([
              'MATERIAL_UNFAMILIAR',
              'TOOL_DIFFICULTY',
              'TIME_CONSTRAINT',
              'OTHER',
            ]),
          )
          .max(8)
          .default([]),
        nextAction: z
          .enum(['RETRY_MISSION', 'TRY_OTHER_MAJOR', 'DISCUSS_FIRST'])
          .nullable()
          .default(null),
        notes: z.string().max(2000).nullable().default(null),
      })
      .strict(),
    activate: z.boolean().default(true),
  })
  .strict();

export type CreateReflectionDto = z.infer<typeof CreateReflectionSchema>;
