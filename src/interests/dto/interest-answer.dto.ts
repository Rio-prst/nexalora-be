import { z } from 'zod';
import { INTEREST_DIMENSIONS } from '../interests.constants.js';

const itemId = z.string().min(1).max(40);
const dimension = z.enum([...INTEREST_DIMENSIONS]);

export const InterestAnswerSchema = z.discriminatedUnion('state', [
  z.object({
    itemId,
    dimension,
    state: z.literal('ANSWERED'),
    value: z.number().int().min(1).max(5),
  }),
  z.object({ itemId, dimension, state: z.literal('UNKNOWN'), value: z.null() }),
  z.object({ itemId, dimension, state: z.literal('SKIPPED'), value: z.null() }),
]);

export type InterestAnswer = z.infer<typeof InterestAnswerSchema>;
