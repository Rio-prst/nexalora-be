import { z } from 'zod';

export const COMPARISON_ROUTES = {
  shortlist: 'shortlist',
  scenarios: 'scenarios',
} as const;

export const MAX_SHORTLIST_PROGRAMS = 3;

export const SaveShortlistSchema = z
  .object({
    programIds: z.array(z.string().min(1).max(80)).max(MAX_SHORTLIST_PROGRAMS),
    expectedProfileVersion: z.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => new Set(data.programIds).size === data.programIds.length, {
    message: 'Shortlist cannot repeat a program',
    path: ['programIds'],
  });

export const CreateScenarioSchema = z
  .object({
    programIds: z
      .array(z.string().min(1).max(80))
      .max(MAX_SHORTLIST_PROGRAMS)
      .default([]),
    overrides: z
      .object({
        monthlyBudgetMax: z.number().int().nonnegative().nullable().optional(),
        upfrontBudgetMax: z.number().int().nonnegative().nullable().optional(),
        housingMode: z.enum(['FAMILY', 'RENT', 'UNKNOWN']).optional(),
        relocationMode: z.enum(['STAY', 'OPEN', 'SELECTED']).optional(),
      })
      .strict(),
  })
  .strict();

export type SaveShortlistDto = z.infer<typeof SaveShortlistSchema>;
export type CreateScenarioDto = z.infer<typeof CreateScenarioSchema>;
