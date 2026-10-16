import { describe, expect, it } from '@jest/globals';
import {
  combinedScore,
  costFeasibility,
  interestScore,
  monthlyEquivalent,
  normalizeDimension,
  reflectionScore,
  upfrontMaximum,
} from './recommendation-calculator.js';
import type { CostComponents } from './dto/recommendation-run.response.dto.js';

function costs(overrides: Partial<CostComponents> = {}): CostComponents {
  return {
    tuitionPerSemester: { min: 6_000_000, max: 6_000_000 },
    livingCostMonthly: { min: 1_500_000, max: 1_500_000 },
    recurringSupportMonthly: null,
    upfrontCost: { min: 2_000_000, max: 2_000_000 },
    ...overrides,
  };
}

describe('normalizeDimension', () => {
  it('maps the 1..5 scale onto 0..1', () => {
    expect(normalizeDimension([1, 1, 1])).toBe(0);
    expect(normalizeDimension([5, 5, 5])).toBe(1);
    expect(normalizeDimension([3, 3, 3])).toBeCloseTo(0.5);
  });

  it('averages the values that are present', () => {
    expect(normalizeDimension([5, 5])).toBe(1);
    expect(normalizeDimension([2, 4])).toBeCloseTo(0.5);
  });

  it('returns null when nothing was answered', () => {
    expect(normalizeDimension([])).toBeNull();
  });
});

describe('interestScore', () => {
  const weights = {
    LOGIC_SYSTEM: 0.55,
    PROCESS_DATA: 0.2,
    VISUAL_COMM: 0.1,
    EXPLORATION_COLLAB: 0.15,
  };

  it('weights the available dimensions by the major heuristic weights', () => {
    const score = interestScore(weights, {
      LOGIC_SYSTEM: 1,
      PROCESS_DATA: 0,
    });

    expect(score).toBeCloseTo((0.55 * 1 + 0.2 * 0) / 0.75);
  });

  it('ignores dimensions the student did not answer', () => {
    const full = interestScore(weights, {
      LOGIC_SYSTEM: 1,
      PROCESS_DATA: 1,
      VISUAL_COMM: 1,
      EXPLORATION_COLLAB: 1,
    });
    const partial = interestScore(weights, { LOGIC_SYSTEM: 1 });

    expect(full).toBeCloseTo(1);
    expect(partial).toBeCloseTo(1);
  });

  it('returns null when no dimension carries a usable weight', () => {
    expect(interestScore(weights, {})).toBeNull();
    expect(interestScore({}, { LOGIC_SYSTEM: 1 })).toBeNull();
  });
});

describe('reflectionScore', () => {
  it('normalises continueInterest onto 0..1', () => {
    expect(reflectionScore(1)).toBe(0);
    expect(reflectionScore(5)).toBe(1);
    expect(reflectionScore(3)).toBeCloseTo(0.5);
  });

  it('treats an unknown continueInterest as absent, not as zero', () => {
    expect(reflectionScore(null)).toBeNull();
  });
});

describe('combinedScore', () => {
  it('applies the 0.7 / 0.3 weights', () => {
    expect(combinedScore(1, 0)).toBeCloseTo(0.7);
    expect(combinedScore(0, 1)).toBeCloseTo(0.3);
  });

  it('falls back to the initial interest when there is no reflection', () => {
    expect(combinedScore(0.8, null)).toBe(0.8);
  });

  it('has no score when the interest itself is unavailable', () => {
    expect(combinedScore(null, null)).toBeNull();
  });

  it('accepts no timing, hint, or failure input at all (AC-05B)', () => {
    const arity = combinedScore.length;

    expect(arity).toBe(2);
  });
});

describe('monthlyEquivalent', () => {
  it('divides tuition by six semesters and adds the recurring parts', () => {
    const result = monthlyEquivalent(costs());

    expect(result.min).toBe(1_000_000 + 1_500_000);
    expect(result.max).toBe(1_000_000 + 1_500_000);
  });

  it('keeps an unknown cost as null rather than zero', () => {
    const result = monthlyEquivalent(
      costs({ livingCostMonthly: { min: null, max: null } }),
    );

    expect(result).toEqual({ min: null, max: null });
  });

  it('treats a missing recurring component as nothing to add', () => {
    const result = monthlyEquivalent(costs());

    expect(result.min).toBe(2_500_000);
  });

  it('spans the range when tuition has a min and a max', () => {
    const result = monthlyEquivalent(
      costs({ tuitionPerSemester: { min: 3_000_000, max: 9_000_000 } }),
    );

    expect(result.min).toBe(500_000 + 1_500_000);
    expect(result.max).toBe(1_500_000 + 1_500_000);
  });
});

describe('upfrontMaximum', () => {
  it('reads the upper bound', () => {
    expect(upfrontMaximum(costs())).toBe(2_000_000);
  });

  it('stays null when the upfront cost is unknown', () => {
    expect(upfrontMaximum(costs({ upfrontCost: null }))).toBeNull();
    expect(
      upfrontMaximum(costs({ upfrontCost: { min: null, max: null } })),
    ).toBeNull();
  });
});

describe('costFeasibility', () => {
  it('reports INSUFFICIENT_DATA when the budget is unknown (AC-03B)', () => {
    expect(costFeasibility(null, costs())).toBe('INSUFFICIENT_DATA');
  });

  it('reports INSUFFICIENT_DATA when a required cost component is null (AC-03B)', () => {
    expect(
      costFeasibility(10_000_000, costs({ livingCostMonthly: null })),
    ).toBe('INSUFFICIENT_DATA');
    expect(
      costFeasibility(
        10_000_000,
        costs({ tuitionPerSemester: { min: null, max: null } }),
      ),
    ).toBe('INSUFFICIENT_DATA');
  });

  it('reports WITHIN_BUDGET when the upper bound fits', () => {
    expect(costFeasibility(3_000_000, costs())).toBe('WITHIN_BUDGET');
  });

  it('reports DEPENDS_ON_SCENARIO when the budget sits inside the range', () => {
    const components = costs({
      tuitionPerSemester: { min: 3_000_000, max: 30_000_000 },
    });

    expect(costFeasibility(3_000_000, components)).toBe('DEPENDS_ON_SCENARIO');
  });

  it('reports NEEDS_FINANCIAL_AID when even the lower bound exceeds the budget', () => {
    const components = costs({
      tuitionPerSemester: { min: 30_000_000, max: 60_000_000 },
    });

    expect(costFeasibility(1_000_000, components)).toBe('NEEDS_FINANCIAL_AID');
  });
});
