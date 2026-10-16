import { Module } from '@nestjs/common';
import { IRecommendationRepository } from './interfaces/recommendation.repository.interface.js';
import { IRecommendationService } from './interfaces/recommendation.service.interface.js';
import { RecommendationController } from './recommendation.controller.js';
import { RecommendationRepository } from './recommendation.repository.js';
import { RecommendationService } from './recommendation.service.js';

@Module({
  controllers: [RecommendationController],
  providers: [
    { provide: IRecommendationRepository, useClass: RecommendationRepository },
    { provide: IRecommendationService, useClass: RecommendationService },
  ],
  exports: [IRecommendationService],
})
export class RecommendationsModule {}
