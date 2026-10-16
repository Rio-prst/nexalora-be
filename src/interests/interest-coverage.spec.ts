import { describe, expect, it } from '@jest/globals';
import { computeCoverage } from './interest-coverage.js';
import type { InterestAnswer } from './dto/interest-answer.dto.js';
import type { InterestDimension } from './interests.constants.js';

function answered(
  dimension: InterestDimension,
  values: number[],
): InterestAnswer[] {
  return values.map((value, index) => ({
    itemId: `${dimension.toLowerCase()}-${index}`,
    dimension,
    state: 'ANSWERED',
    value,
  }));
}

function nonNumeric(
  dimension: InterestDimension,
  state: 'UNKNOWN' | 'SKIPPED',
): InterestAnswer {
  return {
    itemId: `${dimension.toLowerCase()}-${state.toLowerCase()}`,
    dimension,
    state,
    value: null,
  };
}

describe('computeCoverage', () => {
  it('reports no coverage for an empty answer set', () => {
    expect(computeCoverage([])).toEqual({
      answeredDimensions: 0,
      availableDimensions: [],
      isSufficientForPersonalization: false,
    });
  });

  it('marks a dimension available once two of its items are answered', () => {
    const coverage = computeCoverage(answered('LOGIC_SYSTEM', [5, 4]));

    expect(coverage.answeredDimensions).toBe(1);
    expect(coverage.availableDimensions).toEqual(['LOGIC_SYSTEM']);
  });

  it('leaves a dimension unavailable when only one item is answered', () => {
    const coverage = computeCoverage(answered('LOGIC_SYSTEM', [5]));

    expect(coverage.availableDimensions).toEqual([]);
  });

  it('never counts UNKNOWN as a zero (T02)', () => {
    const withUnknown = computeCoverage([
      ...answered('LOGIC_SYSTEM', [5]),
      nonNumeric('LOGIC_SYSTEM', 'UNKNOWN'),
    ]);

    expect(withUnknown.availableDimensions).toEqual([]);
  });

  it('never counts SKIPPED as a zero', () => {
    const coverage = computeCoverage([
      ...answered('LOGIC_SYSTEM', [5]),
      nonNumeric('LOGIC_SYSTEM', 'SKIPPED'),
      nonNumeric('LOGIC_SYSTEM', 'SKIPPED'),
    ]);

    expect(coverage.availableDimensions).toEqual([]);
  });

  it('is not sufficient below three available dimensions (AC-03D)', () => {
    const coverage = computeCoverage([
      ...answered('LOGIC_SYSTEM', [5, 4]),
      ...answered('PROCESS_DATA', [3, 3]),
    ]);

    expect(coverage.answeredDimensions).toBe(2);
    expect(coverage.isSufficientForPersonalization).toBe(false);
  });

  it('is sufficient at exactly three available dimensions', () => {
    const coverage = computeCoverage([
      ...answered('LOGIC_SYSTEM', [5, 4]),
      ...answered('PROCESS_DATA', [3, 3]),
      ...answered('VISUAL_COMM', [4, 5]),
    ]);

    expect(coverage.answeredDimensions).toBe(3);
    expect(coverage.isSufficientForPersonalization).toBe(true);
  });

  it('returns dimensions in the declared instrument order', () => {
    const coverage = computeCoverage([
      ...answered('EXPLORATION_COLLAB', [4, 4]),
      ...answered('LOGIC_SYSTEM', [5, 5]),
      ...answered('VISUAL_COMM', [4, 4]),
      ...answered('PROCESS_DATA', [3, 3]),
    ]);

    expect(coverage.availableDimensions).toEqual([
      'LOGIC_SYSTEM',
      'PROCESS_DATA',
      'VISUAL_COMM',
      'EXPLORATION_COLLAB',
    ]);
  });

  it('is deterministic for the same input', () => {
    const answers = [
      ...answered('LOGIC_SYSTEM', [5, 4]),
      ...answered('PROCESS_DATA', [3, 3]),
      ...answered('VISUAL_COMM', [4, 5]),
    ];

    expect(computeCoverage(answers)).toEqual(computeCoverage(answers));
  });
});
