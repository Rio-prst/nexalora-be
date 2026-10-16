import { z } from 'zod';

export const PASSPORT_ROUTES = {
  base: 'passports',
  detail: 'passports/:id',
} as const;

export const PASSPORT_SECTIONS = [
  'profile',
  'academicRecords',
  'budget',
  'interests',
  'recommendations',
  'reflections',
  'simulations',
  'plans',
] as const;

export type PassportSection = (typeof PASSPORT_SECTIONS)[number];

export const REDACTED_BY_DEFAULT: ReadonlyArray<PassportSection> = [
  'academicRecords',
  'budget',
  'reflections',
];

export const CreatePassportSchema = z
  .object({
    includeFields: z
      .array(z.enum(PASSPORT_SECTIONS))
      .max(PASSPORT_SECTIONS.length)
      .default([]),
  })
  .strict();

export type CreatePassportDto = z.infer<typeof CreatePassportSchema>;
