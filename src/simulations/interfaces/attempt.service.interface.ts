import type {
  CreateAttemptDto,
  RunAttemptDto,
  UpdateAttemptDto,
} from '../dto/attempt.dto.js';
import type { AttemptSnapshot } from './attempt.repository.interface.js';

export interface IAttemptService {
  create(
    userId: string,
    idempotencyKey: string,
    input: CreateAttemptDto,
  ): Promise<{ attempt: AttemptSnapshot; replayed: boolean }>;
  get(userId: string, id: string): Promise<AttemptSnapshot>;
  saveDraft(
    userId: string,
    id: string,
    input: UpdateAttemptDto,
  ): Promise<AttemptSnapshot>;
  run(
    userId: string,
    id: string,
    input: RunAttemptDto,
  ): Promise<AttemptSnapshot>;
}

export const IAttemptService = Symbol('IAttemptService');
