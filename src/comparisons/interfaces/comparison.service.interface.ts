import type { SaveShortlistDto, CreateScenarioDto } from '../comparison.dto.js';
import type {
  ScenarioResult,
  ShortlistSnapshot,
} from './comparison.repository.interface.js';

export interface IComparisonService {
  getShortlist(userId: string): Promise<ShortlistSnapshot>;
  saveShortlist(
    userId: string,
    input: SaveShortlistDto,
  ): Promise<ShortlistSnapshot>;
  createScenario(
    userId: string,
    input: CreateScenarioDto,
  ): Promise<ScenarioResult>;
}

export const IComparisonService = Symbol('IComparisonService');
