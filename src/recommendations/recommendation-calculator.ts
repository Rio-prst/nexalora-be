import {
  SEMESTER_MONTHS_DEFAULT,
  WEIGHT_INITIAL_INTEREST,
  WEIGHT_REFLECTION,
} from './recommendation.constants.js';
import type {
  CostComponents,
  CostFeasibilityStatus,
  CostRange,
} from './dto/recommendation-run.response.dto.js';

export type DimensionScores = Readonly<Record<string, number | undefined>>;

export function normalizeDimension(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return (total / values.length - 1) / 4;
}

export function interestScore(
  weights: Readonly<Record<string, unknown>>,
  scores: DimensionScores,
): number | null {
  let numerator = 0;
  let denominator = 0;

  for (const [dimension, weight] of Object.entries(weights)) {
    if (typeof weight !== 'number') continue;

    const score = scores[dimension];
    if (score === undefined) continue;

    numerator += weight * score;
    denominator += weight;
  }

  if (denominator === 0) return null;

  return numerator / denominator;
}

export function reflectionScore(
  continueInterest: number | null,
): number | null {
  if (continueInterest === null) return null;
  return (continueInterest - 1) / 4;
}

export function combinedScore(
  initialInterest: number | null,
  reflection: number | null,
): number | null {
  if (initialInterest === null) return null;
  if (reflection === null) return initialInterest;

  return (
    WEIGHT_INITIAL_INTEREST * initialInterest + WEIGHT_REFLECTION * reflection
  );
}

function readRange(value: unknown): CostRange | null {
  if (typeof value !== 'object' || value === null) return null;

  const range = value as Record<string, unknown>;
  const min = typeof range['min'] === 'number' ? range['min'] : null;
  const max = typeof range['max'] === 'number' ? range['max'] : null;

  return { min, max };
}

type CompleteRange = { min: number; max: number };

function requireRange(value: CostRange | null): CompleteRange | null {
  if (value === null) return null;
  if (value.min === null || value.max === null) return null;
  return { min: value.min, max: value.max };
}

export function monthlyEquivalent(components: CostComponents): {
  min: number | null;
  max: number | null;
} {
  const tuition = requireRange(readRange(components.tuitionPerSemester));
  const living = requireRange(readRange(components.livingCostMonthly));

  if (tuition === null || living === null) {
    return { min: null, max: null };
  }

  const recurring = readRange(components.recurringSupportMonthly);

  return {
    min:
      tuition.min / SEMESTER_MONTHS_DEFAULT +
      living.min +
      (recurring?.min ?? 0),
    max:
      tuition.max / SEMESTER_MONTHS_DEFAULT +
      living.max +
      (recurring?.max ?? 0),
  };
}

export function upfrontMaximum(components: CostComponents): number | null {
  const upfront = readRange(components.upfrontCost);
  if (upfront === null) return null;
  if (upfront.max !== null) return upfront.max;
  return upfront.min;
}

export function costFeasibility(
  budgetMax: number | null,
  components: CostComponents,
): CostFeasibilityStatus {
  if (budgetMax === null) return 'INSUFFICIENT_DATA';

  const equivalent = monthlyEquivalent(components);
  if (equivalent.min === null || equivalent.max === null) {
    return 'INSUFFICIENT_DATA';
  }

  if (equivalent.max <= budgetMax) return 'WITHIN_BUDGET';
  if (equivalent.min <= budgetMax) return 'DEPENDS_ON_SCENARIO';

  return 'NEEDS_FINANCIAL_AID';
}
