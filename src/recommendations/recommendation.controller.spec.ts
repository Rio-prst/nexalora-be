import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { RecommendationController } from './recommendation.controller.js';
import type { IRecommendationService } from './interfaces/recommendation.service.interface.js';
import type { RecommendationRunPayload } from './dto/recommendation-run.response.dto.js';

const PAYLOAD: RecommendationRunPayload = {
  runId: 'run_1',
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

type Create = (
  userId: string,
  input: unknown,
) => Promise<RecommendationRunPayload>;
type Latest = (userId: string) => Promise<RecommendationRunPayload>;

function build() {
  const create = jest.fn<Create>(() => Promise.resolve(PAYLOAD));
  const latest = jest.fn<Latest>(() => Promise.resolve(PAYLOAD));

  const service = { create, latest } as unknown as IRecommendationService;

  return {
    controller: new RecommendationController(service),
    create,
    latest,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

const USER = { userId: '550e8400-e29b-41d4-a716-446655440000' } as never;

describe('RecommendationController', () => {
  it('takes the userId from the token, never from the body', async () => {
    const { controller, create } = build();

    await controller.create(
      USER,
      { profileVersion: 3, activeReflectionIds: [] },
      responseStub(),
    );

    expect(create).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      {
        profileVersion: 3,
        activeReflectionIds: [],
      },
    );
  });

  it('wraps the created run in the data/meta envelope', async () => {
    const { controller } = build();

    const result = await controller.create(
      USER,
      { profileVersion: 3, activeReflectionIds: [] },
      responseStub(),
    );

    expect(result).toEqual({
      data: PAYLOAD,
      meta: { requestId: 'req_ctrl' },
    });
  });

  it('reads the latest run for the authenticated account', async () => {
    const { controller, latest } = build();

    const result = await controller.latest(USER, responseStub());

    expect(latest).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result.data).toEqual(PAYLOAD);
  });

  it('lists recommendation history for the authenticated account', async () => {
    const history = jest.fn((_userId: string) =>
      Promise.resolve([{ id: 'run_1' } as never]),
    );
    const service = { history } as unknown as IRecommendationService;
    const controller = new RecommendationController(service);

    const result = await controller.history(USER, responseStub());

    expect(history).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(result.data).toEqual([{ id: 'run_1' }]);
  });

  it('retrieves a recommendation detail by id', async () => {
    const getById = jest.fn((_userId: string, _id: string) =>
      Promise.resolve({ id: 'run_1' } as never),
    );
    const service = { getById } as unknown as IRecommendationService;
    const controller = new RecommendationController(service);

    const result = await controller.getById(USER, 'run_1', responseStub());

    expect(getById).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'run_1',
    );
    expect(result.data).toEqual({ id: 'run_1' });
  });
});
