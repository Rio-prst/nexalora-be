import { describe, expect, it, jest } from '@jest/globals';
import { SimulationSubmissionService } from './simulation-submission.service.js';
import type { ISimulationSubmissionRepository } from './interfaces/simulation-submission.repository.interface.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { Role } from '../common/types/role.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440000';
const SUBMISSION_ID = 'sub-123';

const STUDENT_USER: AuthenticatedUser = {
  userId: USER_ID,
  role: Role.STUDENT,
};

const CURATOR_USER: AuthenticatedUser = {
  userId: OTHER_USER_ID,
  role: Role.CURATOR,
};

const MOCK_SUBMISSION = {
  id: SUBMISSION_ID,
  userId: USER_ID,
  missionId: 'inf-m1',
  fileName: 'project.pdf',
  fileUrl: 'https://storage.test/project.pdf',
  fileSizeBytes: 1024,
  studentNotes: 'My project',
  checklistConfirmed: true,
  reviewStatus: null,
  ratingStars: null,
  reviewNotes: null,
  reviewedAt: null,
  createdAt: '2026-10-16T10:00:00.000Z',
};

function build() {
  const findMission = jest.fn((id: string) => Promise.resolve({ id }));
  const insert = jest.fn(() => Promise.resolve(MOCK_SUBMISSION));
  const review = jest.fn(() => Promise.resolve(MOCK_SUBMISSION));
  const listPassports = jest.fn(() => Promise.resolve([]));
  const listByUser = jest.fn((_userId: string) =>
    Promise.resolve([MOCK_SUBMISSION]),
  );
  const findById = jest.fn((id: string) =>
    Promise.resolve(id === SUBMISSION_ID ? MOCK_SUBMISSION : null),
  );

  const repository: ISimulationSubmissionRepository = {
    findMission: findMission,
    insert: insert,
    review: review,
    listPassports: listPassports,
    listByUser: listByUser,
    findById: findById,
  };

  return {
    service: new SimulationSubmissionService(repository),
    findMission,
    insert,
    review,
    listByUser,
    findById,
  };
}

describe('SimulationSubmissionService', () => {
  describe('mySubmissions', () => {
    it('returns submissions for the user', async () => {
      const { service, listByUser } = build();
      const result = await service.mySubmissions(USER_ID);

      expect(listByUser).toHaveBeenCalledWith(USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(SUBMISSION_ID);
    });
  });

  describe('getById', () => {
    it('allows the owner to view the submission', async () => {
      const { service } = build();
      const result = await service.getById(STUDENT_USER, SUBMISSION_ID);

      expect(result.id).toBe(SUBMISSION_ID);
    });

    it('allows a CURATOR to view any submission', async () => {
      const { service } = build();
      const result = await service.getById(CURATOR_USER, SUBMISSION_ID);

      expect(result.id).toBe(SUBMISSION_ID);
    });

    it('denies another student from viewing the submission (404 NOT_FOUND)', async () => {
      const { service } = build();
      const otherStudent: AuthenticatedUser = {
        userId: OTHER_USER_ID,
        role: Role.STUDENT,
      };

      await expect(
        service.getById(otherStudent, SUBMISSION_ID),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });

  describe('getDownloadUrl', () => {
    it('returns download url for the owner', async () => {
      const { service } = build();
      const result = await service.getDownloadUrl(STUDENT_USER, SUBMISSION_ID);

      expect(result.downloadUrl).toBe(MOCK_SUBMISSION.fileUrl);
      expect(result.fileName).toBe(MOCK_SUBMISSION.fileName);
      expect(result.expiresInSeconds).toBe(3600);
    });

    it('denies non-owner student from generating download url', async () => {
      const { service } = build();
      const otherStudent: AuthenticatedUser = {
        userId: OTHER_USER_ID,
        role: Role.STUDENT,
      };

      await expect(
        service.getDownloadUrl(otherStudent, SUBMISSION_ID),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });
});
