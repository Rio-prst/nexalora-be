import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  CreatedInterestSubmission,
  IInterestSubmissionRepository,
  SubmitInterestsInput,
} from './interfaces/interest-submission.repository.interface.js';

@Injectable()
export class InterestSubmissionRepository implements IInterestSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: SubmitInterestsInput,
  ): Promise<CreatedInterestSubmission> {
    const row = await this.prisma.interestSubmission.create({
      data: {
        userId,
        instrumentVersion: input.instrumentVersion,
        answersJson: input.answers,
      },
    });

    return {
      id: row.id,
      instrumentVersion: row.instrumentVersion,
      submittedAt: row.submittedAt,
    };
  }
}
