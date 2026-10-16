import { describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';
import { ProfileController } from './profile.controller.js';
import type { IProfileService } from './interfaces/profile.service.interface.js';
import type {
  AccountDataExport,
  IProfileExportRepository,
} from './interfaces/profile-export.repository.interface.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import type { ProfileSnapshot } from './dto/profile.response.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { Role } from '../common/types/role.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER: AuthenticatedUser = { userId: USER_ID, role: Role.STUDENT };

function makeSnapshot(
  overrides: Partial<ProfileSnapshot> = {},
): ProfileSnapshot {
  return {
    userId: USER_ID,
    version: 1,
    displayName: 'Nadia',
    gradeLevel: 'XII',
    graduationYear: 2027,
    cityCode: null,
    provinceCode: null,
    relocationMode: null,
    preferredRegions: [],
    preferredMajors: [],
    monthlyBudgetMin: null,
    monthlyBudgetMax: null,
    upfrontBudgetMax: null,
    housingMode: null,
    pinnedPrograms: [],
    schoolSubjects: [],
    consents: [],
    ...overrides,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

function build() {
  const getProfile = jest.fn<(userId: string) => Promise<ProfileSnapshot>>(() =>
    Promise.resolve(makeSnapshot()),
  );
  const updateProfile = jest.fn<
    (userId: string, input: UpdateProfileDto) => Promise<ProfileSnapshot>
  >(() => Promise.resolve(makeSnapshot({ version: 2 })));
  const deleteAccountData = jest.fn<(userId: string) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const service = {
    getProfile,
    updateProfile,
    deleteAccountData,
  } as unknown as IProfileService;

  const exportRepository = {
    loadAll: jest.fn<(userId: string) => Promise<AccountDataExport | null>>(
      () => Promise.resolve(null),
    ),
  } as unknown as IProfileExportRepository;

  return {
    controller: new ProfileController(service, exportRepository),
    getProfile,
    updateProfile,
    deleteAccountData,
  };
}

describe('ProfileController', () => {
  describe('GET /api/profile', () => {
    it('reads the user id from the verified token, not from a parameter', async () => {
      const { controller, getProfile } = build();

      await controller.getProfile(USER, responseStub());

      expect(getProfile).toHaveBeenCalledWith(USER_ID);
    });

    it('wraps the result in the success envelope', async () => {
      const { controller } = build();

      const result = await controller.getProfile(USER, responseStub());

      expect(result).toEqual({
        data: expect.objectContaining({ userId: USER_ID, version: 1 }),
        meta: { requestId: 'req_ctrl' },
      });
    });
  });

  describe('PATCH /api/profile', () => {
    it('forwards the validated body and the token user id separately', async () => {
      const { controller, updateProfile } = build();
      const body: UpdateProfileDto = {
        expectedVersion: 1,
        displayName: 'Nadia',
      };

      await controller.updateProfile(USER, body, responseStub());

      expect(updateProfile).toHaveBeenCalledWith(USER_ID, body);
    });

    it('returns the envelope with the updated version', async () => {
      const { controller } = build();

      const result = await controller.updateProfile(
        USER,
        { expectedVersion: 1 },
        responseStub(),
      );

      expect(result.data.version).toBe(2);
      expect(result.meta.requestId).toBe('req_ctrl');
    });
  });

  describe('DELETE /api/account-data', () => {
    it('deletes only the authenticated account', async () => {
      const { controller, deleteAccountData } = build();

      await controller.deleteAccountData(USER);

      expect(deleteAccountData).toHaveBeenCalledWith(USER_ID);
    });
  });
});
