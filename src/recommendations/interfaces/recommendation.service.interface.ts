import type { CreateRecommendationDto } from '../dto/create-recommendation.dto.js';
import type { RecommendationRunPayload } from '../dto/recommendation-run.response.dto.js';
import type {
  StoredRecommendationRun,
  StoredRecommendationRunSummary,
} from './recommendation.repository.interface.js';

export interface IRecommendationService {
  create(
    userId: string,
    input: CreateRecommendationDto,
  ): Promise<RecommendationRunPayload>;
  latest(userId: string): Promise<RecommendationRunPayload>;
  history(
    userId: string,
    limit?: number,
  ): Promise<StoredRecommendationRunSummary[]>;
  getById(userId: string, id: string): Promise<StoredRecommendationRun>;
}

export const IRecommendationService = Symbol('IRecommendationService');
