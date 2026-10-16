import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@jest/globals';
import {
  combinedScore,
  costFeasibility,
  interestScore,
  monthlyEquivalent,
  normalizeDimension,
} from './recommendation-calculator.js';
import { academicReadiness } from './recommendation-academic.js';
import type { CostComponents } from './dto/recommendation-run.response.dto.js';

const GOLDEN = JSON.parse(
  readFileSync(
    new URL('./__fixtures__/recommendation-golden.json', import.meta.url),
    'utf8',
  ),
) as {
  coverage: {
    answeredDimensions: number;
    isSufficientForPersonalization: boolean;
  };
  majors: Array<{ majorId: string; reasons: Array<{ code: string }> }>;
  items: Array<{
    programId: string;
    costStatus: string;
    costBreakdown: {
      monthlyEquivalentMin: number | null;
      monthlyEquivalentMax: number | null;
      upfrontMax: number | null;
    };
  }>;
};

const NUMERIC: Record<string, number[]> = {
  LOGIC_SYSTEM: [5, 4, 5],
  PROCESS_DATA: [2, 2, 1],
  VISUAL_COMM: [3, 3, 3],
  EXPLORATION_COLLAB: [2, 1, 2],
};

const WEIGHTS = {
  LOGIC_SYSTEM: 0.55,
  PROCESS_DATA: 0.2,
  VISUAL_COMM: 0.1,
  EXPLORATION_COLLAB: 0.15,
};

function range(min: number | null, max: number | null) {
  return { min, max };
}

describe('golden fixture (T03)', () => {
  it('reproduces the stored coverage exactly', () => {
    expect(GOLDEN.coverage.answeredDimensions).toBe(4);
    expect(GOLDEN.coverage.isSufficientForPersonalization).toBe(true);
  });

  it('reproduces the stored major ordering and reasons', () => {
    expect(GOLDEN.majors.map((major) => major.majorId)).toEqual(['INF']);
    expect(GOLDEN.majors[0]?.reasons[0]?.code).toBe('ACTIVITY_INTEREST');
  });

  it('reproduces the stored program order with pinned first (AC-03F)', () => {
    expect(GOLDEN.items.map((item) => item.programId)).toEqual([
      'itb-inf-s1',
      'ugm-inf-s1',
    ]);
  });

  it('reproduces the stored cost statuses', () => {
    expect(GOLDEN.items[0]?.costStatus).toBe('DEPENDS_ON_SCENARIO');
    expect(GOLDEN.items[1]?.costStatus).toBe('INSUFFICIENT_DATA');
  });

  it('reproduces the stored monthly equivalent range', () => {
    const components: CostComponents = {
      tuitionPerSemester: range(6_000_000, 15_000_000),
      livingCostMonthly: range(1_000_000, 1_500_000),
      recurringSupportMonthly: range(0, 0),
      upfrontCost: range(1_500_000, 2_000_000),
    };

    const equivalent = monthlyEquivalent(components);

    expect(equivalent.min).toBe(
      GOLDEN.items[0]?.costBreakdown.monthlyEquivalentMin,
    );
    expect(equivalent.max).toBe(
      GOLDEN.items[0]?.costBreakdown.monthlyEquivalentMax,
    );
    expect(costFeasibility(3_000_000, components)).toBe(
      GOLDEN.items[0]?.costStatus,
    );
  });

  it('reproduces the stored insufficient-data case', () => {
    const components: CostComponents = {
      tuitionPerSemester: range(null, null),
      livingCostMonthly: range(1_000_000, 1_500_000),
      recurringSupportMonthly: null,
      upfrontCost: null,
    };

    expect(monthlyEquivalent(components).min).toBe(
      GOLDEN.items[1]?.costBreakdown.monthlyEquivalentMin,
    );
  });

  it('reproduces the stored personalisation decision (AC-03D)', () => {
    const scores: Record<string, number> = {};
    for (const [dimension, values] of Object.entries(NUMERIC)) {
      const normalized = normalizeDimension(values);
      if (normalized !== null) scores[dimension] = normalized;
    }

    expect(Object.keys(scores).length).toBe(GOLDEN.coverage.answeredDimensions);
    expect(interestScore(WEIGHTS, scores)).not.toBeNull();
  });

  it('reproduces the stored academic readiness', () => {
    expect(academicReadiness(['Matematika'], ['Matematika', 'Fisika'])).toBe(
      'PARTIAL',
    );
  });

  it('keeps the reflection-free branch stable across repeated runs', () => {
    const interest = interestScore(WEIGHTS, {
      LOGIC_SYSTEM: 1,
      PROCESS_DATA: 0.5,
      VISUAL_COMM: 0.5,
      EXPLORATION_COLLAB: 0.25,
    });

    const runs = Array.from({ length: 5 }, () => combinedScore(interest, null));

    expect(new Set(runs).size).toBe(1);
    expect(runs[0]).toBe(interest);
  });
});
