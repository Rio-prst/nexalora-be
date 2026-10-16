import { z } from 'zod';
import { MAX_FILE_SIZE_BYTES, REVIEW_STATUSES } from './simulation.routes.js';

export const SubmitProjectSchema = z
  .object({
    missionId: z.string().min(1).max(80),
    fileName: z.string().min(1).max(200),
    fileUrl: z.string().url().max(2000),
    fileSizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_FILE_SIZE_BYTES, 'File exceeds the 10 MB limit'),
    studentNotes: z.string().max(2000).nullable().default(null),
    checklistConfirmed: z.boolean().default(false),
  })
  .strict();

export const ReviewSubmissionSchema = z
  .object({
    status: z.enum(REVIEW_STATUSES),
    ratingStars: z.number().int().min(1).max(5).nullable().default(null),
    reviewNotes: z.string().max(2000).nullable().default(null),
  })
  .strict()
  .refine((data) => data.status !== 'lulus' || data.ratingStars !== null, {
    message: 'A passing review requires a rating',
    path: ['ratingStars'],
  });

export type SubmitProjectDto = z.infer<typeof SubmitProjectSchema>;
export type ReviewSubmissionDto = z.infer<typeof ReviewSubmissionSchema>;
