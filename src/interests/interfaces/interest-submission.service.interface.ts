import type { SubmitInterestsDto } from '../dto/submit-interests.dto.js';
import type { InterestSubmissionRecord } from '../dto/interest-submission.response.dto.js';

export interface IInterestSubmissionService {
  submit(
    userId: string,
    input: SubmitInterestsDto,
  ): Promise<InterestSubmissionRecord>;
}

export const IInterestSubmissionService = Symbol('IInterestSubmissionService');
