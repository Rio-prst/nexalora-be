import type { InterestAnswer } from './interest-answer.dto.js';
import type { InterestCoverage } from '../interest-coverage.js';

export interface InterestSubmissionRecord {
  id: string;
  instrumentVersion: string;
  answers: InterestAnswer[];
  submittedAt: string;
  coverage: InterestCoverage;
}
