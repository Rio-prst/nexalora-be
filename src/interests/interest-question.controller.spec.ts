import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { InterestQuestionController } from './interest-question.controller.js';
import type {
  IInterestQuestionRepository,
  InterestInstrument,
} from './interest-question.repository.js';

const INSTRUMENT: InterestInstrument = {
  instrumentVersion: 'v0.1',
  scale: {
    answered: { min: 1, max: 5 },
    states: ['ANSWERED', 'UNKNOWN', 'SKIPPED'],
  },
  questions: [
    {
      itemId: 'q1',
      dimension: 'LOGIC_SYSTEM',
      cluster: 'informatika',
      category: 'Logika & Sistem',
      prompt: 'Seberapa menarik bagimu menyusun langkah-langkah berurutan?',
      subtext: 'Misalnya menyusun aturan sortir berkas.',
      position: 1,
    },
  ],
};

type ListFn = () => Promise<InterestInstrument | null>;

function build() {
  const listQuestions = jest.fn<ListFn>(() => Promise.resolve(INSTRUMENT));

  const repository = {
    listQuestions,
  } as unknown as IInterestQuestionRepository;

  return {
    controller: new InterestQuestionController(repository),
    listQuestions,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

describe('InterestQuestionController', () => {
  it('returns the instrument version and its questions', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data.instrumentVersion).toBe('v0.1');
    expect(result.data.questions).toHaveLength(1);
  });

  it('publishes the answer scale alongside the items', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data.scale.answered).toEqual({ min: 1, max: 5 });
    expect(result.data.scale.states).toContain('UNKNOWN');
  });

  it('returns an empty question list before the seed has run', async () => {
    const { controller, listQuestions } = build();
    listQuestions.mockResolvedValue(null);

    const result = await controller.list(responseStub());

    expect(result.data.questions).toEqual([]);
    expect(result.meta.requestId).toBe('req_ctrl');
  });
});
