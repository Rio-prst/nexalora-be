import {
  INTEREST_DIMENSIONS,
  MIN_AVAILABLE_DIMENSIONS,
  MIN_ITEMS_PER_DIMENSION,
  type InterestDimension,
} from './interests.constants.js';
import type { InterestAnswer } from './dto/interest-answer.dto.js';

export interface InterestCoverage {
  answeredDimensions: number;
  availableDimensions: InterestDimension[];
  isSufficientForPersonalization: boolean;
}

export function computeCoverage(answers: InterestAnswer[]): InterestCoverage {
  const numericByDimension = new Map<InterestDimension, number[]>();

  for (const answer of answers) {
    if (answer.state !== 'ANSWERED') continue;

    const values = numericByDimension.get(answer.dimension) ?? [];
    values.push(answer.value);
    numericByDimension.set(answer.dimension, values);
  }

  const availableDimensions = INTEREST_DIMENSIONS.filter(
    (dimension) =>
      (numericByDimension.get(dimension)?.length ?? 0) >=
      MIN_ITEMS_PER_DIMENSION,
  );

  return {
    answeredDimensions: availableDimensions.length,
    availableDimensions: [...availableDimensions],
    isSufficientForPersonalization:
      availableDimensions.length >= MIN_AVAILABLE_DIMENSIONS,
  };
}
