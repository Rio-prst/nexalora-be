import { describe, expect, it, jest } from '@jest/globals';
import { InterestSubmissionService } from './interest-submission.service.js';
import type {
  CreatedInterestSubmission,
  IInterestSubmissionRepository,
} from './interfaces/interest-submission.repository.interface.js';
import type { SubmitInterestsDto } from './dto/submit-interests.dto.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const SUBMITTED_AT = new Date('2026-10-16T08:00:00.000Z');

type Create = (
  userId: string,
  input: { instrumentVersion: string; answers: unknown[] },
) => Promise<CreatedInterestSubmission>;

function build() {
  const create = jest.fn<Create>(() =>
    Promise.resolve({
      id: 'sub_1',
      instrumentVersion: 'v0.1',
      submittedAt: SUBMITTED_AT,
    }),
  );

  const repository = {
    create,
  } as unknown as IInterestSubmissionRepository;

  return { service: new InterestSubmissionService(repository), create };
}

const ANSWERED = {
  itemId: 'q1',
  dimension: 'LOGIC_SYSTEM',
  state: 'ANSWERED',
  value: 5,
} as const;

const UNKNOWN = {
  itemId: 'q2',
  dimension: 'LOGIC_SYSTEM',
  state: 'UNKNOWN',
  value: null,
} as const;

const VALID: SubmitInterestsDto = {
  instrumentVersion: 'v0.1',
  answers: [
    { ...ANSWERED },
    { ...UNKNOWN },
    { itemId: 'q7', dimension: 'LOGIC_SYSTEM', state: 'ANSWERED', value: 4 },
    { itemId: 'q3', dimension: 'PROCESS_DATA', state: 'ANSWERED', value: 4 },
    { itemId: 'q4', dimension: 'PROCESS_DATA', state: 'ANSWERED', value: 3 },
    { itemId: 'q5', dimension: 'VISUAL_COMM', state: 'ANSWERED', value: 5 },
    { itemId: 'q6', dimension: 'VISUAL_COMM', state: 'ANSWERED', value: 4 },
  ],
};

describe('InterestSubmissionService', () => {
  it('stores the submission under the authenticated user id', async () => {
    const { service, create } = build();

    await service.submit(USER_ID, VALID);

    expect(create).toHaveBeenCalledWith(USER_ID, {
      instrumentVersion: 'v0.1',
      answers: VALID.answers,
    });
  });

  it('never takes the user id from the request body', async () => {
    const { service, create } = build();

    const spoofed = {
      ...VALID,
      userId: '00000000-0000-4000-8000-000000000000',
    } as unknown as SubmitInterestsDto;

    await service.submit(USER_ID, spoofed);

    expect(create).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  it('returns the created record inside the shape of the response contract', async () => {
    const { service } = build();

    const result = await service.submit(USER_ID, VALID);

    expect(result).toEqual({
      id: 'sub_1',
      instrumentVersion: 'v0.1',
      answers: VALID.answers,
      submittedAt: '2026-10-16T08:00:00.000Z',
      coverage: expect.objectContaining({ answeredDimensions: 3 }),
    });
  });

  it('preserves UNKNOWN as null rather than coercing it to zero', async () => {
    const { service, create } = build();

    const result = await service.submit(USER_ID, VALID);

    expect(create).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        answers: expect.arrayContaining([
          expect.objectContaining({ itemId: 'q2', value: null }),
        ]),
      }),
    );
    expect(result.answers).toEqual(VALID.answers);
  });

  it('computes coverage from the submitted answers', async () => {
    const { service } = build();

    const result = await service.submit(USER_ID, VALID);

    expect(result.coverage).toEqual({
      answeredDimensions: 3,
      availableDimensions: ['LOGIC_SYSTEM', 'PROCESS_DATA', 'VISUAL_COMM'],
      isSufficientForPersonalization: true,
    });
  });

  it('reports insufficient coverage when too few dimensions are answered', async () => {
    const { service } = build();

    const result = await service.submit(USER_ID, {
      instrumentVersion: 'v0.1',
      answers: [
        {
          itemId: 'q1',
          dimension: 'LOGIC_SYSTEM',
          state: 'ANSWERED',
          value: 5,
        },
        {
          itemId: 'q2',
          dimension: 'LOGIC_SYSTEM',
          state: 'UNKNOWN',
          value: null,
        },
      ],
    });

    expect(result.coverage.isSufficientForPersonalization).toBe(false);
  });
});
