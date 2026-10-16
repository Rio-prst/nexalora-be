import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';
import { AppError } from '../errors/app-error.js';

const Schema = z.object({
  name: z.string().min(1),
  score: z.number().min(0).max(100),
});

describe('ZodValidationPipe', () => {
  it('returns parsed data for a valid payload', () => {
    const pipe = new ZodValidationPipe(Schema);

    expect(pipe.transform({ name: 'Nadia', score: 88 })).toEqual({
      name: 'Nadia',
      score: 88,
    });
  });

  it('strips unknown keys so controllers never see undeclared fields', () => {
    const pipe = new ZodValidationPipe(Schema);

    expect(pipe.transform({ name: 'Nadia', score: 88, isAdmin: true })).toEqual(
      { name: 'Nadia', score: 88 },
    );
  });

  it('rejects an invalid payload with VALIDATION_ERROR and treeified details', () => {
    const pipe = new ZodValidationPipe(Schema);

    try {
      pipe.transform({ name: '', score: 500 });
      throw new Error('expected the pipe to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe('VALIDATION_ERROR');
      expect(appError.status).toBe(400);
      expect(appError.details).toMatchObject({
        properties: {
          name: { errors: expect.any(Array) },
          score: { errors: expect.any(Array) },
        },
      });
    }
  });

  it('keeps null as a valid value when the schema allows it', () => {
    const NullableSchema = z.object({ cityCode: z.string().nullable() });
    const pipe = new ZodValidationPipe(NullableSchema);

    expect(pipe.transform({ cityCode: null })).toEqual({ cityCode: null });
  });
});
