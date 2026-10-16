import { z } from 'zod';
import {
  AcademicSubjectInputSchema,
  ConsentInputSchema,
} from './academic-subject.dto.js';

export const UpdateProfileSchema = z
  .object({
    expectedVersion: z.number().int().positive(),

    consent: ConsentInputSchema.optional(),
    displayName: z.string().min(1).max(120).optional(),

    gradeLevel: z.enum(['XI', 'XII', 'OTHER']).optional(),
    graduationYear: z.number().int().min(2025).max(2035).optional(),

    cityCode: z.string().max(40).nullable().optional(),
    provinceCode: z.string().max(40).nullable().optional(),
    relocationMode: z.enum(['STAY', 'OPEN', 'SELECTED']).optional(),
    preferredRegions: z.array(z.string().max(40)).max(10).optional(),
    preferredMajors: z.array(z.string().max(40)).max(5).optional(),

    // Nullable on purpose. `null` means "the student has not said yet", which
    // is different from Rp 0 and must never be coerced into one (AC-03B).
    monthlyBudgetMin: z.number().int().nonnegative().nullable().optional(),
    monthlyBudgetMax: z.number().int().nonnegative().nullable().optional(),
    upfrontBudgetMax: z.number().int().nonnegative().nullable().optional(),
    housingMode: z.enum(['FAMILY', 'RENT', 'UNKNOWN']).optional(),

    pinnedPrograms: z.array(z.string().max(80)).max(3).optional(),
    schoolSubjects: z.array(AcademicSubjectInputSchema).max(60).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => key !== 'expectedVersion'),
    {
      message: 'At least one field besides expectedVersion must be provided',
      path: [],
    },
  )
  .refine(
    (data) =>
      data.monthlyBudgetMin == null ||
      data.monthlyBudgetMax == null ||
      data.monthlyBudgetMin <= data.monthlyBudgetMax,
    {
      message: 'monthlyBudgetMin must not exceed monthlyBudgetMax',
      path: ['monthlyBudgetMin'],
    },
  );

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
