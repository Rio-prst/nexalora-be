import { describe, expect, it, jest } from '@jest/globals';
import { AttemptService } from './attempt.service.js';
import type {
  AttemptSnapshot,
  IAttemptRepository,
  NewAttempt,
  StoredMission,
} from './interfaces/attempt.repository.interface.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER_ID = 'bbbbbbbb-0000-4000-8000-0000000000b2';

const MISSION_INF: StoredMission = {
  id: 'mission-inf',
  missionVersion: 'v1',
  engineVersion: 'INF-v1',
  majorId: 'INF',
  config: { engine: 'INF-v1' },
};

const MISSION_IND: StoredMission = {
  id: 'mission-ind',
  missionVersion: 'v1',
  engineVersion: 'IND-v1',
  majorId: 'IND',
  config: { engine: 'IND-v1' },
};

function attempt(overrides: Partial<AttemptSnapshot> = {}): AttemptSnapshot {
  return {
    id: 'att_1',
    missionId: MISSION_INF.id,
    missionVersion: 'v1',
    seed: 'seed-1',
    status: 'DRAFT',
    draftArtifact: { stock: 2, quantity: 1, paymentSuccess: true },
    result: null,
    revision: 0,
    lastRunRevision: null,
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-10-16T08:00:00.000Z',
    ...overrides,
  };
}

type StoredMissionArg = StoredMission;

function build(
  stored: AttemptSnapshot = attempt(),
  mission: StoredMissionArg | null = MISSION_INF,
) {
  const findByIdempotencyKey = jest.fn<
    (userId: string, key: string) => Promise<AttemptSnapshot | null>
  >(() => Promise.resolve(null));
  const findMission = jest.fn<
    (missionId: string) => Promise<StoredMissionArg | null>
  >(() => Promise.resolve(mission));
  const insert = jest.fn<(attempt: NewAttempt) => Promise<AttemptSnapshot>>(
    () => Promise.resolve(stored),
  );
  const findOwned = jest.fn<
    (userId: string, id: string) => Promise<AttemptSnapshot | null>
  >(() => Promise.resolve(stored));
  const saveDraft = jest.fn<
    (
      userId: string,
      id: string,
      expected: number,
      draft: unknown,
    ) => Promise<AttemptSnapshot | null>
  >(() => Promise.resolve({ ...stored, revision: stored.revision + 1 }));
  const saveResult = jest.fn<
    (
      userId: string,
      id: string,
      expected: number,
      result: unknown,
    ) => Promise<AttemptSnapshot | null>
  >(() =>
    Promise.resolve({
      ...stored,
      status: 'RESULT_READY',
      result: { outcome: 'COMPLETED' },
      lastRunRevision: stored.revision + 1,
      revision: stored.revision + 1,
    }),
  );

  const repository = {
    findByIdempotencyKey,
    findMission,
    insert,
    findOwned,
    saveDraft,
    saveResult,
  } as unknown as IAttemptRepository;

  return {
    service: new AttemptService(repository),
    findByIdempotencyKey,
    findMission,
    insert,
    findOwned,
    saveDraft,
    saveResult,
  };
}

describe('AttemptService', () => {
  describe('create', () => {
    it('stores a new attempt for the authenticated account', async () => {
      const { service, insert } = build();

      const result = await service.create(USER_ID, 'idem-1', {
        missionId: 'mission-inf',
        seed: 'seed-1',
      });

      expect(result.replayed).toBe(false);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, idempotencyKey: 'idem-1' }),
      );
    });

    it('replays the same attempt for a repeated Idempotency-Key (T15)', async () => {
      const { service, insert, findByIdempotencyKey } = build();
      findByIdempotencyKey.mockResolvedValue(attempt({ id: 'att_existing' }));

      const result = await service.create(USER_ID, 'idem-1', {
        missionId: 'mission-inf',
        seed: 'seed-1',
      });

      expect(result.replayed).toBe(true);
      expect(result.attempt.id).toBe('att_existing');
      expect(insert).not.toHaveBeenCalled();
    });

    it('refuses an unknown mission', async () => {
      const { service } = build(attempt(), null);

      await expect(
        service.create(USER_ID, 'idem-1', {
          missionId: 'missing',
          seed: 'seed-1',
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('get', () => {
    it('reads an attempt the caller owns', async () => {
      const { service } = build();

      const result = await service.get(USER_ID, 'att_1');

      expect(result.id).toBe('att_1');
    });

    it('reports not found for another account attempt (T01)', async () => {
      const { service, findOwned } = build();
      findOwned.mockResolvedValue(null);

      await expect(service.get(OTHER_ID, 'att_1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('saveDraft', () => {
    it('advances the revision on a matching expectedRevision', async () => {
      const { service, saveDraft } = build();

      const result = await service.saveDraft(USER_ID, 'att_1', {
        expectedRevision: 0,
        draftArtifact: { stock: 1 },
      });

      expect(saveDraft).toHaveBeenCalledWith(USER_ID, 'att_1', 0, {
        stock: 1,
      });
      expect(result.revision).toBe(1);
    });

    it('raises a version conflict when the revision is stale (T15)', async () => {
      const { service, saveDraft } = build();
      saveDraft.mockResolvedValue(null);

      await expect(
        service.saveDraft(USER_ID, 'att_1', {
          expectedRevision: 7,
          draftArtifact: {},
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
    });
  });

  describe('run', () => {
    it('computes and stores the INF result', async () => {
      const { service, saveResult } = build();

      const result = await service.run(USER_ID, 'att_1', {
        scenarioId: 'scenario_1',
        expectedRevision: 0,
      });

      expect(saveResult).toHaveBeenCalled();
      expect(result.status).toBe('RESULT_READY');
    });

    it('runs the IND engine and enforces the scenario capacity', async () => {
      const stored = attempt({
        missionId: MISSION_IND.id,
        draftArtifact: { workerAllocation: [3, 2, 1] },
      });
      const { service } = build(stored, MISSION_IND);

      const result = await service.run(USER_ID, 'att_1', {
        scenarioId: 'scenario_1',
        expectedRevision: 0,
      });

      expect(result.status).toBe('RESULT_READY');
    });

    it('refuses to run against a stale revision', async () => {
      const { service, saveResult } = build();

      await expect(
        service.run(USER_ID, 'att_1', {
          scenarioId: 'scenario_1',
          expectedRevision: 9,
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });

      expect(saveResult).not.toHaveBeenCalled();
    });
  });
});
