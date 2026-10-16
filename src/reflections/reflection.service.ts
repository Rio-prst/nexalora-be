import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import { RECOMMENDATION_RULE_VERSION } from '../recommendations/recommendation.constants.js';
import type { CreateReflectionDto } from './reflection.dto.js';
import { IReflectionRepository } from './interfaces/reflection.repository.interface.js';
import type { ReflectionPreview } from './interfaces/reflection.repository.interface.js';
import type { IReflectionService } from './interfaces/reflection.service.interface.js';

@Injectable()
export class ReflectionService implements IReflectionService {
  constructor(
    @Inject(IReflectionRepository)
    private readonly repository: IReflectionRepository,
  ) {}

  async create(userId: string, input: CreateReflectionDto) {
    const attempt = await this.repository.findOwnedAttempt(
      userId,
      input.attemptId,
    );

    if (!attempt) {
      throw notFound('Attempt not found');
    }

    if (
      input.expectedRevision !== undefined &&
      attempt.revision !== input.expectedRevision
    ) {
      throw versionConflict(input.expectedRevision, attempt.revision);
    }

    if (input.activate) {
      await this.repository.deactivateOthers(userId, attempt.id);
    }

    const revision = (await this.repository.findLatestRevision(attempt.id)) + 1;

    const reflection = await this.repository.insert({
      userId,
      attemptId: attempt.id,
      revision,
      responses: input.responses,
      isActive: input.activate,
    });

    const preview: ReflectionPreview = {
      reflectionId: reflection.id,
      majorId: attempt.majorId,
      continueInterest: input.responses.continueInterest,
      experienceStatus: 'TRIED',
      preview: {
        ruleVersion: RECOMMENDATION_RULE_VERSION,
        reflectionApplied: true,
        pendingApplication: true,
        note: 'Preview only; nothing was recomputed or stored',
      },
    };

    return { reflection, preview };
  }
}
