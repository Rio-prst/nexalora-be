import { z } from 'zod';

export const AcademicSubjectInputSchema = z.object({
  subject: z.string().min(1).max(100),
  semester: z.number().int().min(1).max(6),
  score: z.number().min(0).max(100),
  scale: z.literal('0-100').default('0-100'),
});

export type AcademicSubjectInput = z.infer<typeof AcademicSubjectInputSchema>;

export const ConsentInputSchema = z.object({
  purposeVersion: z.string().min(1).max(40),
  isAccepted: z.boolean(),
});

export type ConsentInput = z.infer<typeof ConsentInputSchema>;
