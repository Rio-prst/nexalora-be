import { Injectable, type PipeTransform } from '@nestjs/common';
import { treeifyError, type ZodType } from 'zod';
import { validationError } from '../errors/app-error.js';

/**
 * Validates HTTP input with Zod before it reaches any service layer.
 *
 * Instantiated per route, because the schema differs per payload:
 * `@Body(new ZodValidationPipe(UpdateProfileSchema))`
 *
 * Zod 4 is used rather than the deprecated `error.flatten()`; see
 * docs/ARCHITECTURE.md section 5.1. Rejecting an empty `PATCH` body belongs in
 * the schema itself via `.refine()`, not here.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw validationError(treeifyError(result.error));
    }

    return result.data;
  }
}
