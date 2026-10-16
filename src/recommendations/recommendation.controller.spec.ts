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
});
