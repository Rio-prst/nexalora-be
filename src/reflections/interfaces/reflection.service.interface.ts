import type { CreateReflectionDto } from '../reflection.dto.js';
import type {
  ReflectionPreview,
  ReflectionSnapshot,
} from '../interfaces/reflection.repository.interface.js';

export interface IReflectionService {
  create(
    userId: string,
    input: CreateReflectionDto,
  ): Promise<{ reflection: ReflectionSnapshot; preview: ReflectionPreview }>;
}

export const IReflectionService = Symbol('IReflectionService');
