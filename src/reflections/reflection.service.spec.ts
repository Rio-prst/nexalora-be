import { describe, expect, it, jest } from '@jest/globals';
import { ReflectionService } from './reflection.service.js';
import type {
  IReflectionRepository,
  NewReflection,
  OwnedAttempt,
  ReflectionSnapshot,
} from './interfaces/reflection.repository.interface.js';
import type { CreateReflectionDto } from './reflection.dto.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER_ID = 'bbbbbbbb-0000-4000-8000-0000000000b2';

const RESPONSE: CreateReflectionDto = {
  attemptId: '11111111-0000-4000-8000-000000000001',
  responses: {
    continueInterest: 5,
    expectationChange: 'MATCHED',
    obstacles: [],
    nextAction: 'DISCUSS_FIRST',
    notes: null,
  },
  activate: true,
};

const STORED: ReflectionSnapshot = {
  id: '22222222-0000-4000-8000-000000000002',
  attemptId: RESPONSE.attemptId,
  revision: 1,
  isActive: true,
  responses: RESPONSE.responses,
  createdAt: '2026-10-16T08:00:00.000Z',
};

function build(owned = true) {
  const findOwnedAttempt = jest.fn<
    (userId: string, attemptId: string) => Promise<OwnedAttempt | null>
  >(() =>
    Promise.resolve(
      owned
        ? {
            id: RESPONSE.attemptId,
            missionId: 'mission-inf',
            majorId: 'INF',
            revision: 3,
          }
        : null,
    ),
  );
  const findLatestRevision = jest.fn<(attemptId: string) => Promise<number>>(
    () => Promise.resolve(0),
  );
  const deactivateOthers = jest.fn<
    (userId: string, attemptId: string) => Promise<void>
  >(() => Promise.resolve());
  const insert = jest.fn<
    (reflection: NewReflection) => Promise<ReflectionSnapshot>
  >(() => Promise.resolve(STORED));

  const repository = {
    findOwnedAttempt,
    findLatestRevision,
    deactivateOthers,
    insert,
  } as unknown as IReflectionRepository;

  return {
    service: new ReflectionService(repository),
    findOwnedAttempt,
    findLatestRevision,
    deactivateOthers,
    insert,
  };
}

describe('ReflectionService', () => {
  it('stores the reflection for the authenticated account', async () => {
    const { service, insert } = build();

    const result = await service.create(USER_ID, RESPONSE);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, revision: 1 }),
    );
    expect(result.reflection.id).toBe(STORED.id);
  });

  it('marks the major as tried in the preview', async () => {
    const { service } = build();

    const result = await service.create(USER_ID, RESPONSE);

    expect(result.preview.experienceStatus).toBe('TRIED');
    expect(result.preview.majorId).toBe('INF');
  });

  it('never applies the preview to a stored recommendation run', async () => {
    const { service } = build();

    const result = await service.create(USER_ID, RESPONSE);

    expect(result.preview.preview.pendingApplication).toBe(true);
  });

  it('refuses an attempt owned by another account (T01)', async () => {
    const { service } = build(false);

    await expect(service.create(OTHER_ID, RESPONSE)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('raises a version conflict on a stale attempt revision (T15)', async () => {
    const { service } = build();

    await expect(
      service.create(USER_ID, {
        ...RESPONSE,
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
  });

  it('increments the revision for a second reflection on the same attempt', async () => {
    const { service, findLatestRevision } = build();
    findLatestRevision.mockResolvedValue(4);

    await service.create(USER_ID, RESPONSE);

    expect(findLatestRevision).toHaveBeenCalledWith(RESPONSE.attemptId);
  });

  it('deactivates the previous active reflection when activating', async () => {
    const { service, deactivateOthers } = build();

    await service.create(USER_ID, RESPONSE);

    expect(deactivateOthers).toHaveBeenCalledWith(USER_ID, RESPONSE.attemptId);
  });

  it('keeps an unknown continueInterest as null rather than zero', async () => {
    const { service, insert } = build();

    await service.create(USER_ID, {
      ...RESPONSE,
      responses: { ...RESPONSE.responses, continueInterest: null },
    });

    const stored = insert.mock.calls[0]?.[0];
    const responses = stored?.responses as { continueInterest: number | null };

    expect(responses.continueInterest).toBeNull();
  });
});
