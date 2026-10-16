import type { CreateRecommendationDto } from '../dto/create-recommendation.dto.js';
import type { RecommendationRunPayload } from '../dto/recommendation-run.response.dto.js';

export interface IRecommendationService {
  create(
    userId: string,
    input: CreateRecommendationDto,
  ): Promise<RecommendationRunPayload>;
  latest(userId: string): Promise<RecommendationRunPayload>;
}

export const IRecommendationService = Symbol('IRecommendationService');
