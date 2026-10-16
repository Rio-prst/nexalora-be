import { describe, expect, it, jest } from '@jest/globals';
import { ComparisonService } from './comparison.service.js';
import type {
  IComparisonRepository,
  ScenarioBaseline,
  ScenarioCostProfile,
  ShortlistSnapshot,
} from './interfaces/comparison.repository.interface.js';
import {
  MAX_SHORTLIST_PROGRAMS,
  SaveShortlistSchema,
} from './comparison.dto.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';

const BASELINE: ScenarioBaseline = {
  profileVersion: 2,
  monthlyBudgetMax: 3_000_000,
  upfrontBudgetMax: 5_000_000,
  housingMode: 'RENT',
  relocationMode: 'STAY',
};

const COSTS: ScenarioCostProfile[] = [
  {
    programId: 'ugm-inf-s1',
    components: {
      tuitionPerSemester: { min: 3_000_000, max: 30_000_000 },
      livingCostMonthly: { min: 1_500_000, max: 1_500_000 },
      recurringSupportMonthly: null,
      upfrontCost: { min: 2_000_000, max: 2_000_000 },
    },
    sourceYear: 2026,
  },
];

type Resolve<T> = () => Promise<T>;

function build(overrides: { baseline?: ScenarioBaseline | null } = {}) {
  const findShortlist = jest.fn<Resolve<ShortlistSnapshot | null>>(() =>
    Promise.resolve(null),
  );
  const saveShortlist = jest.fn<
    (
      userId: string,
      ids: string[],
      version: number,
    ) => Promise<ShortlistSnapshot>
  >(() =>
    Promise.resolve({ programIds: [], baseVersion: 2, updatedAt: 'now' }),
  );
  const findBaseline = jest.fn<Resolve<ScenarioBaseline | null>>(() =>
    Promise.resolve(
      overrides.baseline === undefined ? BASELINE : overrides.baseline,
    ),
  );
  const listPublishedCosts = jest.fn<Resolve<ScenarioCostProfile[]>>(() =>
    Promise.resolve(COSTS),
  );
  const insertScenario = jest.fn<
    (input: unknown) => Promise<{ id: string; createdAt: string }>
  >(() => Promise.resolve({ id: 'scn_1', createdAt: 'now' }));

  const repository = {
    findShortlist,
    saveShortlist,
    findBaseline,
    listPublishedCosts,
    insertScenario,
  } as unknown as IComparisonRepository;

  return {
    service: new ComparisonService(repository),
    findShortlist,
    saveShortlist,
    findBaseline,
    listPublishedCosts,
    insertScenario,
  };
}

describe('ComparisonService', () => {
  describe('getShortlist', () => {
    it('returns an empty list before anything is stored', async () => {
      const { service } = build();

      const result = await service.getShortlist(USER_ID);

      expect(result.programIds).toEqual([]);
    });
  });

  describe('saveShortlist', () => {
    it('stores the list against the current profile version', async () => {
      const { service, saveShortlist } = build();

      await service.saveShortlist(USER_ID, {
        programIds: ['ugm-inf-s1'],
      });

      expect(saveShortlist).toHaveBeenCalledWith(USER_ID, ['ugm-inf-s1'], 2);
    });

    it('rejects a stale expectedProfileVersion', async () => {
      const { service } = build();

      await expect(
        service.saveShortlist(USER_ID, {
          programIds: [],
          expectedProfileVersion: 1,
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    });

    it('rejects more than three programs at the schema level', () => {
      const result = SaveShortlistSchema.safeParse({
        programIds: ['a', 'b', 'c', 'd'],
      });

      expect(result.success).toBe(false);
      expect(MAX_SHORTLIST_PROGRAMS).toBe(3);
    });

    it('rejects a repeated program', () => {
      const result = SaveShortlistSchema.safeParse({
        programIds: ['a', 'a'],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createScenario', () => {
    it('never writes the overrides back to the profile (T10)', async () => {
      const { service } = build();

      const result = await service.createScenario(USER_ID, {
        programIds: ['ugm-inf-s1'],
        overrides: { monthlyBudgetMax: 10_000_000 },
      });

      expect(result.persistedToProfile).toBe(false);
    });

    it('keeps the baseline status separate from the scenario status', async () => {
      const { service } = build();

      const result = await service.createScenario(USER_ID, {
        programIds: ['ugm-inf-s1'],
        overrides: { monthlyBudgetMax: 10_000_000 },
      });

      const row = result.programResults[0];

      expect(row?.baseline).toBe('DEPENDS_ON_SCENARIO');
      expect(row?.scenario).toBe('WITHIN_BUDGET');
    });

    it('falls back to the stored budget when no override is given', async () => {
      const { service } = build();

      const result = await service.createScenario(USER_ID, {
        programIds: ['ugm-inf-s1'],
        overrides: {},
      });

      const row = result.programResults[0];

      expect(row?.baseline).toBe(row?.scenario);
    });

    it('records the base profile version it was computed against', async () => {
      const { service, insertScenario } = build();

      const result = await service.createScenario(USER_ID, {
        programIds: [],
        overrides: {},
      });

      expect(result.baseProfileVersion).toBe(2);
      expect(insertScenario).toHaveBeenCalled();
    });

    it('reports INSUFFICIENT_DATA when an override clears the budget', async () => {
      const { service } = build();

      const result = await service.createScenario(USER_ID, {
        programIds: ['ugm-inf-s1'],
        overrides: { monthlyBudgetMax: null },
      });

      expect(result.programResults[0]?.scenario).toBe('INSUFFICIENT_DATA');
    });
  });
});
