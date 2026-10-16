import type { SchemaObject } from '@nestjs/swagger';
import { type ZodType, toJSONSchema } from 'zod';

/**
 * Projects a Zod schema into an OpenAPI schema for `@ApiBody`.
 *
 * `@nestjs/swagger` discovers request bodies from TypeScript decorators such as
 * `@ApiProperty`. A `ZodValidationPipe` carries no such metadata, so a Zod body
 * is invisible to the scanner unless the schema is projected explicitly:
 * `@ApiBody({ schema: toOpenApiSchema(UpdateProfileSchema) })`
 *
 * The `openapi-3.0` target is required. The default target emits JSON Schema
 * draft-2020-12, where a nullable field becomes
 * `anyOf: [{ type: 'integer' }, { type: 'null' }]`. OpenAPI 3.0 does not accept
 * that form and expects `nullable: true` alongside a concrete `type`, which is
 * what this target produces. It also omits the `$schema` keyword.
 *
 * `io: 'input'` describes what the client sends, so fields carrying a `.default()`
 * stay optional, matching what the pipe actually accepts.
 *
 * `unrepresentable: 'any'` keeps refinements such as `superRefine` from throwing;
 * such rules stay enforced by the pipe and simply do not appear in the schema.
 */
export function toOpenApiSchema(schema: ZodType): SchemaObject {
  return toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  }) as SchemaObject;
}
