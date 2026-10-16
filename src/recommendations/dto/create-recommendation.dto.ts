import { z } from 'zod';

export const CreateRecommendationSchema = z
  .object({
    profileVersion: z.number().int().positive(),
    activeReflectionIds: z.array(z.string().uuid()).max(20).default([]),
    expectedCatalogVersion: z.string().min(1).max(40).optional(),
  })
  .strict();

export type CreateRecommendationDto = z.infer<
  typeof CreateRecommendationSchema
>;
