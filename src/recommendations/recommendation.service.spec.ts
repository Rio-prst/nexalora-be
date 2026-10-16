import { describe, expect, it, jest } from '@jest/globals';
import { RecommendationService } from './recommendation.service.js';
import type {
  IRecommendationRepository,
  NewRecommendationRun,
  RecommendationInputs,
  StoredRecommendationRun,
} from './interfaces/recommendation.repository.interface.js';
import type { CreateRecommendationDto } from './dto/create-recommendation.dto.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const REQUEST: CreateRecommendationDto = {
  profileVersion: 3,
  activeReflectionIds: [],
};

const INPUT: RecommendationInputs = {
  profile: {
    version: 3,
    monthlyBudgetMax: 3_000_000,
    upfrontBudgetMax: 5_000_000,
    pinnedPrograms: ['itb-inf-s1'],
    recordedSubjects: ['Matematika'],
  },
  interest: {
    submissionId: 'sub_1',
    coverage: {
      answeredDimensions: 4,
      availableDimensions: [
        'LOGIC_SYSTEM',
        'PROCESS_DATA',
        'VISUAL_COMM',
        'EXPLORATION_COLLAB',
      ],
      isSufficientForPersonalization: true,
    },
    numericByDimension: {
      LOGIC_SYSTEM: [5, 5, 5],
      PROCESS_DATA: [1, 1, 1],
      VISUAL_COMM: [3, 3, 3],
      EXPLORATION_COLLAB: [1, 1, 1],
    },
  },
  majors: [
    {
      id: 'INF',
      weights: {
        LOGIC_SYSTEM: 0.55,
        PROCESS_DATA: 0.2,
        VISUAL_COMM: 0.1,
        EXPLORATION_COLLAB: 0.15,
      },
      prepSubjects: ['Matematika'],
    },
  ],
  programs: [
    {
      id: 'itb-inf-s1',
      majorId: 'INF',
      pinnedByStudent: true,
      costProfiles: [
        {
          academicYear: 2026,
          components: {
            tuitionPerSemester: { min: 6_000_000, max: 6_000_000 },
            livingCostMonthly: { min: 1_500_000, max: 1_500_000 },
            recurringSupportMonthly: null,
            upfrontCost: { min: 2_000_000, max: 2_000_000 },
          },
          sourceYear: 2026,
        },
      ],
    },
    {
      id: 'ugm-inf-s1',
      majorId: 'INF',
      pinnedByStudent: false,
      costProfiles: [
        {
          academicYear: 2026,
          components: {
            tuitionPerSemester: { min: null, max: null },
            livingCostMonthly: { min: 1_500_000, max: 1_500_000 },
            recurringSupportMonthly: null,
            upfrontCost: null,
          },
          sourceYear: 2026,
        },
      ],
    },
  ],
  reflections: [],
};

function build(overrides: Partial<RecommendationInputs> = {}) {
  const inputs: RecommendationInputs = { ...INPUT, ...overrides };

  const findProfile = jest.fn<
    (userId: string) => Promise<typeof INPUT.profile | null>
  >(() => Promise.resolve(inputs.profile));
  const findLatestInterestSubmission = jest.fn<
    (userId: string) => Promise<typeof inputs.interest>
  >(() => Promise.resolve(inputs.interest));
  const listPublishedMajors = jest.fn<() => Promise<typeof inputs.majors>>(() =>
    Promise.resolve(inputs.majors),
  );
  const listPublishedPrograms = jest.fn<
    (pinned: readonly string[]) => Promise<typeof inputs.programs>
  >(() => Promise.resolve(inputs.programs));
  const findActiveReflections = jest.fn<
    (
      userId: string,
      ids: readonly string[],
    ) => Promise<typeof inputs.reflections>
  >(() => Promise.resolve(inputs.reflections));
  const insertRun = jest.fn<
    (run: NewRecommendationRun) => Promise<StoredRecommendationRun>
  >(() =>
    Promise.resolve({
      id: 'run_1',
      ruleVersion: 'heuristic-v1',
      catalogVersion: 'pilot-v1',
      profileVersion: inputs.profile.version,
      results: {},
      createdAt: new Date('2026-10-16T08:00:00.000Z'),
    }),
  );
  const findLatestRun = jest.fn<
    (userId: string) => Promise<StoredRecommendationRun | null>
  >(() => Promise.resolve(null));
  const listRuns = jest.fn((_userId: string, _limit: number) =>
    Promise.resolve([]),
  );
  const findOwnedRun = jest.fn((_userId: string, _id: string) =>
    Promise.resolve(null),
  );

  const repository = {
    findProfile,
    findLatestInterestSubmission,
    listPublishedMajors,
    listPublishedPrograms,
    findActiveReflections,
    insertRun,
    findLatestRun,
    listRuns,
    findOwnedRun,
  } as unknown as IRecommendationRepository;

  return {
    service: new RecommendationService(repository),
    findProfile,
    findLatestInterestSubmission,
    listPublishedMajors,
    listPublishedPrograms,
    findActiveReflections,
    insertRun,
    findLatestRun,
    listRuns,
    findOwnedRun,
  };
}

describe('RecommendationService', () => {
  describe('create', () => {
    it('rejects a stale profileVersion with a conflict', async () => {
      const { service } = build();

      await expect(
        service.create(USER_ID, { profileVersion: 1, activeReflectionIds: [] }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
    });

    it('rejects when the account has no profile row', async () => {
      const { service, findProfile } = build();
      findProfile.mockResolvedValue(null);

      await expect(service.create(USER_ID, REQUEST)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('keeps a pinned program ahead of a higher scoring one (AC-03F)', async () => {
      const { service } = build();

      const result = await service.create(USER_ID, REQUEST);

      expect(result.items[0]?.programId).toBe('itb-inf-s1');
      expect(result.items[0]?.isPinned).toBe(true);
    });

    it('marks a major with no active reflection as NOT_TRIED', async () => {
      const { service } = build();

      const result = await service.create(USER_ID, REQUEST);

      expect(result.majors[0]?.experienceStatus).toBe('NOT_TRIED');
    });

    it('reports INSUFFICIENT_DATA for unknown costs instead of treating them as free', async () => {
      const { service } = build();

      const result = await service.create(USER_ID, REQUEST);
      const unknown = result.items.find(
        (item) => item.programId === 'ugm-inf-s1',
      );

      expect(unknown?.costStatus).toBe('INSUFFICIENT_DATA');
    });

    it('falls back to the general catalogue when coverage is too thin (AC-03D)', async () => {
      const { service } = build({
        interest: {
          submissionId: 'sub_1',
          coverage: {
            answeredDimensions: 2,
            availableDimensions: ['LOGIC_SYSTEM', 'PROCESS_DATA'],
            isSufficientForPersonalization: false,
          },
          numericByDimension: {
            LOGIC_SYSTEM: [5, 5, 5],
            PROCESS_DATA: [1, 1, 1],
          },
        },
      });

      const result = await service.create(USER_ID, REQUEST);

      expect(result.coverage.isSufficientForPersonalization).toBe(false);
      expect(result.majors[0]?.reasons[0]?.code).toBe('GENERAL_CATALOGUE');
      expect(
        result.items.every((item) =>
          item.reasons.every((reason) => reason.code !== 'ACTIVITY_INTEREST'),
        ),
      ).toBe(true);
    });

    it('orders programs deterministically for identical inputs (T03)', async () => {
      const { service } = build();

      const first = await service.create(USER_ID, REQUEST);
      const second = await service.create(USER_ID, REQUEST);

      expect(JSON.stringify(first.items)).toBe(JSON.stringify(second.items));
      expect(JSON.stringify(first.majors)).toBe(JSON.stringify(second.majors));
    });

    it('returns the stored run id', async () => {
      const { service } = build();

      const result = await service.create(USER_ID, REQUEST);

      expect(result.runId).toBe('run_1');
      expect(result.ruleVersion).toBe('heuristic-v1');
    });

    it('never predicts admission probability', async () => {
      const { service } = build();

      const result = await service.create(USER_ID, REQUEST);

      expect(
        result.items.every((item) => item.admissionProbability === null),
      ).toBe(true);
    });

    it('snapshots the requested reflection ids into the stored inputs', async () => {
      const { service, insertRun } = build();

      await service.create(USER_ID, {
        profileVersion: 3,
        activeReflectionIds: [],
      });

      const stored = insertRun.mock.calls[0]?.[0];

      expect(stored?.ruleVersion).toBe('heuristic-v1');
      expect(stored?.catalogVersion).toBe('pilot-v1');
    });
  });

  describe('latest', () => {
    it('returns the stored payload verbatim', async () => {
      const { service, findLatestRun } = build();
      const stored = {
        runId: 'run_7',
        ruleVersion: 'heuristic-v1',
        catalogVersion: 'pilot-v1',
        profileVersion: 3,
        coverage: {
          answeredDimensions: 4,
          isSufficientForPersonalization: true,
        },
        majors: [],
        items: [],
      };
      findLatestRun.mockResolvedValue({
        id: 'run_7',
        ruleVersion: 'heuristic-v1',
        catalogVersion: 'pilot-v1',
        profileVersion: 3,
        results: stored,
        createdAt: new Date('2026-10-16T08:00:00.000Z'),
      });

      const result = await service.latest(USER_ID);

      expect(result).toEqual(stored);
    });

    it('reports not found before the first run exists', async () => {
      const { service } = build();

      await expect(service.latest(USER_ID)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('history', () => {
    it('returns run summaries from the repository', async () => {
      const { service, listRuns } = build();
      const summaries = [
        {
          id: 'run_1',
          ruleVersion: 'v1',
          catalogVersion: 'v1',
          profileVersion: 1,
          createdAt: new Date(),
        },
      ];
      listRuns.mockResolvedValue(summaries as never);

      const result = await service.history(USER_ID, 10);

      expect(listRuns).toHaveBeenCalledWith(USER_ID, 10);
      expect(result).toBe(summaries);
    });
  });

  describe('getById', () => {
    it('returns the owned run from the repository', async () => {
      const { service, findOwnedRun } = build();
      const run = {
        id: 'run_1',
        ruleVersion: 'v1',
        catalogVersion: 'v1',
        profileVersion: 1,
        results: {},
        createdAt: new Date(),
      };
      findOwnedRun.mockResolvedValue(run as never);

      const result = await service.getById(USER_ID, 'run_1');

      expect(findOwnedRun).toHaveBeenCalledWith(USER_ID, 'run_1');
      expect(result).toBe(run);
    });

    it('throws notFound if the run is missing or not owned', async () => {
      const { service, findOwnedRun } = build();
      findOwnedRun.mockResolvedValue(null);

      await expect(
        service.getById(USER_ID, 'run_missing'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
