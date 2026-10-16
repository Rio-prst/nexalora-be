import type { InterestAnswer } from '../dto/interest-answer.dto.js';

export interface SubmitInterestsInput {
  instrumentVersion: string;
  answers: InterestAnswer[];
}

export interface CreatedInterestSubmission {
  id: string;
  instrumentVersion: string;
  submittedAt: Date;
}

export interface IInterestSubmissionRepository {
  create(
    userId: string,
    input: SubmitInterestsInput,
  ): Promise<CreatedInterestSubmission>;
}

export const IInterestSubmissionRepository = Symbol(
  'IInterestSubmissionRepository',
);
