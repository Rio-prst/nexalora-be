import { describe, expect, it, jest } from '@jest/globals';
import { ProfileService } from './profile.service.js';
import { AppError } from '../common/errors/app-error.js';
import type {
  IProfileRepository,
  ProfileAggregate,
  UpdateProfileInput,
} from './interfaces/profile.repository.interface.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfileProvisioningService } from './profile-provisioning.service.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

type RepositoryMocks = Partial<IProfileRepository>;
type FindByUserId = (userId: string) => Promise<ProfileAggregate | null>;
type UpdateWithVersion = (
  userId: string,
  input: UpdateProfileInput,
) => Promise<ProfileAggregate | null>;
type DeleteAccountData = (userId: string) => Promise<boolean>;

function makeAggregate(
  overrides: Partial<ProfileAggregate> = {},
): ProfileAggregate {
  return {
    userId: USER_ID,
    version: 1,
    displayName: null,
    gradeLevel: null,
    graduationYear: null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolSubjects: [],
    consents: [],
    ...overrides,
  };
}

/** Stands in for `findByUserId` that always answers with one aggregate. */
function havingProfile(
  overrides: Partial<ProfileAggregate> = {},
): FindByUserId {
  return () => Promise.resolve(makeAggregate(overrides));
}

function noProfile(): FindByUserId {
  return () => Promise.resolve(null);
}

function build(mocks: RepositoryMocks = {}) {
  const repository: IProfileRepository = {
    ensureExists: jest.fn(() => Promise.resolve()),
    findByUserId: jest.fn<FindByUserId>(() => Promise.resolve(null)),
    updateWithVersion: jest.fn(() => Promise.resolve(null)),
    deleteAccountData: jest.fn(() => Promise.resolve(false)),
    ...mocks,
  };

  const provisioning = {
    ensure: jest.fn(() => Promise.resolve()),
    forget: jest.fn(),
  } as unknown as ProfileProvisioningService;

  return {
    service: new ProfileService(repository, provisioning),
    provisioning: provisioning as unknown as {
      ensure: () => Promise<void>;
      forget: jest.Mock;
    },
  };
}

const VALID_PATCH = {
  expectedVersion: 1,
  displayName: 'Nadia',
} as UpdateProfileDto;

describe('ProfileService', () => {
  describe('getProfile', () => {
    it('returns the snapshot without leaking bookkeeping timestamps', async () => {
      const { service } = build({
        findByUserId: havingProfile({ displayName: 'Nadia' }),
      });

      const snapshot = await service.getProfile(USER_ID);

      expect(snapshot.displayName).toBe('Nadia');
      expect(snapshot).not.toHaveProperty('createdAt');
      expect(snapshot).not.toHaveProperty('updatedAt');
    });

    it('throws 404 when the account has no profile row', async () => {
      const { service } = build({ findByUserId: noProfile() });

      await expect(service.getProfile(USER_ID)).rejects.toThrow(AppError);
    });

    it('preserves null budgets instead of coercing them to zero', async () => {
      const { service } = build({
        findByUserId: havingProfile({ monthlyBudgetMax: null }),
      });

      const snapshot = await service.getProfile(USER_ID);

      expect(snapshot.monthlyBudgetMax).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('applies the patch and returns the new snapshot', async () => {
      const updateWithVersion = jest.fn<UpdateWithVersion>(() =>
        Promise.resolve(makeAggregate({ version: 2, displayName: 'Nadia' })),
      );
      const { service } = build({
        findByUserId: havingProfile({ version: 1 }),
        updateWithVersion,
      });

      const snapshot = await service.updateProfile(USER_ID, VALID_PATCH);

      expect(snapshot.version).toBe(2);
      expect(updateWithVersion).toHaveBeenCalledWith(USER_ID, VALID_PATCH);
    });

    it('never passes a userId taken from the request body', async () => {
      const updateWithVersion = jest.fn<UpdateWithVersion>(() =>
        Promise.resolve(makeAggregate({ version: 2 })),
      );
      const { service } = build({
        findByUserId: havingProfile(),
        updateWithVersion,
      });

      const spoofed = {
        ...VALID_PATCH,
        userId: '00000000-0000-4000-8000-000000000000',
      } as unknown as UpdateProfileDto;

      await service.updateProfile(USER_ID, spoofed);

      expect(updateWithVersion).toHaveBeenCalledWith(
        USER_ID,
        expect.anything(),
      );
    });

    it('rejects a stale expectedVersion with 409 before writing', async () => {
      const updateWithVersion = jest.fn(() =>
        Promise.resolve(makeAggregate({ version: 4 })),
      );
      const { service } = build({
        findByUserId: havingProfile({ version: 3 }),
        updateWithVersion,
      });

      await expect(
        service.updateProfile(USER_ID, VALID_PATCH),
      ).rejects.toMatchObject({
        status: 409,
        code: 'VERSION_CONFLICT',
        details: { expectedVersion: 1, latestVersion: 3 },
      });

      expect(updateWithVersion).not.toHaveBeenCalled();
    });

    it('re-reads the version when the write loses a race', async () => {
      const findByUserId = jest.fn<FindByUserId>();
      findByUserId.mockResolvedValueOnce(makeAggregate({ version: 1 }));
      findByUserId.mockResolvedValueOnce(makeAggregate({ version: 5 }));

      const { service } = build({
        findByUserId,
        updateWithVersion: () => Promise.resolve(null),
      });

      await expect(
        service.updateProfile(USER_ID, VALID_PATCH),
      ).rejects.toMatchObject({
        details: { expectedVersion: 1, latestVersion: 5 },
      });
    });

    it('throws 404 when the profile row is missing', async () => {
      const { service } = build({ findByUserId: noProfile() });

      await expect(service.updateProfile(USER_ID, VALID_PATCH)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('deleteAccountData', () => {
    it('removes the account data', async () => {
      const deleteAccountData = jest.fn<DeleteAccountData>(() =>
        Promise.resolve(true),
      );
      const { service } = build({ deleteAccountData });

      await service.deleteAccountData(USER_ID);

      expect(deleteAccountData).toHaveBeenCalledWith(USER_ID);
    });

    it('clears the provisioning cache so the next request re-provisions', async () => {
      const { service, provisioning } = build({
        deleteAccountData: () => Promise.resolve(true),
      });

      await service.deleteAccountData(USER_ID);

      expect(provisioning.forget).toHaveBeenCalledWith(USER_ID);
    });

    it('throws 404 when there was nothing to delete', async () => {
      const { service } = build({
        deleteAccountData: () => Promise.resolve(false),
      });

      await expect(service.deleteAccountData(USER_ID)).rejects.toThrow(
        AppError,
      );
    });
  });
});
