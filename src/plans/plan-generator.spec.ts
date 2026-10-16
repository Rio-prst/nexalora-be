import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  buildPlanDraft,
  hasPrerequisiteCycle,
} from './plan-generator.js';
import {
  MIN_PLAN_TASKS,
  PLAN_DURATION_DAYS,
  type PlanDraftTask,
} from './plan.constants.js';

const START = new Date('2026-10-16T00:00:00.000Z');

function task(overrides: Partial<PlanDraftTask> = {}): PlanDraftTask {
  return {
    key: 'task-1',
    title: 'Do the thing',
    actionType: 'EXPLORE_MAJOR',
    estimatedMinutes: 45,
    dueDate: '2026-10-18',
    prerequisiteKey: null,
    ...overrides,
  };
}

describe('buildPlanDraft', () => {
  it('produces at least three tasks even without a career goal (AC-08C, T12)', () => {
    const draft = buildPlanDraft(START, 180, []);

    expect(draft.tasks.length).toBeGreaterThanOrEqual(MIN_PLAN_TASKS);
  });

  it('spans exactly thirty calendar days', () => {
    const draft = buildPlanDraft(START, 180, []);

    expect(draft.startDate).toBe('2026-10-16');
    expect(draft.endDate).toBe('2026-11-14');
    expect(PLAN_DURATION_DAYS).toBe(30);
  });

  it('keeps every due date inside the plan range', () => {
    const draft = buildPlanDraft(START, 180, []);

    for (const entry of draft.tasks) {
      expect(entry.dueDate >= draft.startDate).toBe(true);
      expect(entry.dueDate <= draft.endDate).toBe(true);
    }
  });

  it('never asks for more time than the student has each week', () => {
    const draft = buildPlanDraft(START, 20, []);

    for (const entry of draft.tasks) {
      expect(entry.estimatedMinutes).toBeLessThanOrEqual(20);
    }
  });

  it('is deterministic for identical input (T03)', () => {
    const first = buildPlanDraft(START, 180, ['career-1']);
    const second = buildPlanDraft(START, 180, ['career-1']);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('chains prerequisites forward without looping', () => {
    const draft = buildPlanDraft(START, 180, []);

    expect(hasPrerequisiteCycle(draft.tasks)).toBe(false);
  });

  it('adds a task when the student names a career goal', () => {
    const bare = buildPlanDraft(START, 180, []);
    const withGoal = buildPlanDraft(START, 180, ['career-1']);

    expect(withGoal.tasks.length).toBeGreaterThan(bare.tasks.length);
  });
});

describe('addDays', () => {
  it('moves across a month boundary', () => {
    expect(addDays(new Date('2026-10-30T00:00:00.000Z'), 2).toISOString()).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });
});

describe('hasPrerequisiteCycle', () => {
  it('detects a self reference', () => {
    expect(hasPrerequisiteCycle([task({ prerequisiteKey: 'task-1' })])).toBe(
      true,
    );
  });

  it('detects a two step loop', () => {
    const tasks = [
      task({ key: 'a', prerequisiteKey: 'b' }),
      task({ key: 'b', prerequisiteKey: 'a' }),
    ];

    expect(hasPrerequisiteCycle(tasks)).toBe(true);
  });

  it('accepts a linear chain', () => {
    const tasks = [
      task({ key: 'a', prerequisiteKey: null }),
      task({ key: 'b', prerequisiteKey: 'a' }),
      task({ key: 'c', prerequisiteKey: 'b' }),
    ];

    expect(hasPrerequisiteCycle(tasks)).toBe(false);
  });
});
