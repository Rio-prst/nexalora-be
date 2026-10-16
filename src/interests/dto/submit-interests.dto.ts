import { z } from 'zod';
import {
  MAX_ANSWERS,
  MAX_ITEMS_PER_DIMENSION,
  type InterestDimension,
} from '../interests.constants.js';
import { InterestAnswerSchema } from './interest-answer.dto.js';

export const SubmitInterestsSchema = z
  .object({
    instrumentVersion: z.string().min(1).max(40),
    answers: z.array(InterestAnswerSchema).min(1).max(MAX_ANSWERS),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();

    for (const answer of data.answers) {
      if (seen.has(answer.itemId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate itemId: ${answer.itemId}`,
          path: ['answers'],
        });
      }
      seen.add(answer.itemId);
    }

    const perDimension = new Map<InterestDimension, number>();
    for (const answer of data.answers) {
      perDimension.set(
        answer.dimension,
        (perDimension.get(answer.dimension) ?? 0) + 1,
      );
    }

    for (const [dimension, count] of perDimension) {
      if (count > MAX_ITEMS_PER_DIMENSION) {
        ctx.addIssue({
          code: 'custom',
          message: `Dimension ${dimension} accepts at most ${MAX_ITEMS_PER_DIMENSION} items`,
          path: ['answers'],
        });
      }
    }
  });

export type SubmitInterestsDto = z.infer<typeof SubmitInterestsSchema>;
