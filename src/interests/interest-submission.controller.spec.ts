import { describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';
import { InterestSubmissionController } from './interest-submission.controller.js';
import type { IInterestSubmissionService } from './interfaces/interest-submission.service.interface.js';
import type { InterestSubmissionRecord } from './dto/interest-submission.response.dto.js';
import type { SubmitInterestsDto } from './dto/submit-interests.dto.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { Role } from '../common/types/role.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER: AuthenticatedUser = { userId: USER_ID, role: Role.STUDENT };

function makeRecord(): InterestSubmissionRecord {
  return {
    id: 'sub_1',
    instrumentVersion: 'v0.1',
    answers: [
      { itemId: 'q1', dimension: 'LOGIC_SYSTEM', state: 'ANSWERED', value: 5 },
    ],
    submittedAt: '2026-10-16T08:00:00.000Z',
    coverage: {
      answeredDimensions: 0,
      availableDimensions: [],
      isSufficientForPersonalization: false,
    },
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

function build() {
  const submit = jest.fn<
    (
      userId: string,
      input: SubmitInterestsDto,
    ) => Promise<InterestSubmissionRecord>
  >(() => Promise.resolve(makeRecord()));

  const service = { submit } as unknown as IInterestSubmissionService;

  return { controller: new InterestSubmissionController(service), submit };
}

const VALID: SubmitInterestsDto = {
  instrumentVersion: 'v0.1',
  answers: [
    { itemId: 'q1', dimension: 'LOGIC_SYSTEM', state: 'ANSWERED', value: 5 },
  ],
};

describe('InterestSubmissionController', () => {
  it('reads the user id from the verified token', async () => {
    const { controller, submit } = build();

    await controller.submit(USER, VALID, responseStub());

    expect(submit).toHaveBeenCalledWith(USER_ID, VALID);
  });

  it('wraps the result in the success envelope', async () => {
    const { controller } = build();

    const result = await controller.submit(USER, VALID, responseStub());

    expect(result.data.id).toBe('sub_1');
    expect(result.meta.requestId).toBe('req_ctrl');
  });

  it('forwards the validated body untouched', async () => {
    const { controller, submit } = build();

    const body: SubmitInterestsDto = {
      instrumentVersion: 'v0.1',
      answers: [
        {
          itemId: 'q2',
          dimension: 'PROCESS_DATA',
          state: 'UNKNOWN',
          value: null,
        },
      ],
    };

    await controller.submit(USER, body, responseStub());

    expect(submit).toHaveBeenCalledWith(USER_ID, body);
  });
});
