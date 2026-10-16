import { Inject, Injectable } from '@nestjs/common';
import { computeCoverage } from './interest-coverage.js';
import type { SubmitInterestsDto } from './dto/submit-interests.dto.js';
import type { InterestSubmissionRecord } from './dto/interest-submission.response.dto.js';
import { IInterestSubmissionRepository } from './interfaces/interest-submission.repository.interface.js';
import type { IInterestSubmissionService } from './interfaces/interest-submission.service.interface.js';

@Injectable()
export class InterestSubmissionService implements IInterestSubmissionService {
  constructor(
    @Inject(IInterestSubmissionRepository)
    private readonly repository: IInterestSubmissionRepository,
  ) {}

  async submit(
    userId: string,
    input: SubmitInterestsDto,
  ): Promise<InterestSubmissionRecord> {
    const created = await this.repository.create(userId, {
      instrumentVersion: input.instrumentVersion,
      answers: input.answers,
    });

    return {
      id: created.id,
      instrumentVersion: created.instrumentVersion,
      answers: input.answers,
      submittedAt: created.submittedAt.toISOString(),
      coverage: computeCoverage(input.answers),
    };
  }
}
