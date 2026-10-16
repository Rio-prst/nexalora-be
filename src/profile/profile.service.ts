import { Inject, Injectable } from '@nestjs/common';
import { notFound, versionConflict } from '../common/errors/app-error.js';
import type { ProfileSnapshot } from './dto/profile.response.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { IProfileRepository } from './interfaces/profile.repository.interface.js';
import type { IProfileService } from './interfaces/profile.service.interface.js';
import { ProfileProvisioningService } from './profile-provisioning.service.js';

/**
 * Built field by field rather than by spreading the row.
 *
 * `created_at` and `updated_at` are bookkeeping and have no business in a
 * profile response, and an explicit list means a column added to the schema
 * later cannot leak into the API by accident.
 */
function toSnapshot(
  aggregate: NonNullable<
    Awaited<ReturnType<IProfileRepository['findByUserId']>>
  >,
): ProfileSnapshot {
  return {
    userId: aggregate.userId,
    version: aggregate.version,

    displayName: aggregate.displayName,
    gradeLevel: aggregate.gradeLevel,
    graduationYear: aggregate.graduationYear,

    cityCode: aggregate.cityCode,
    provinceCode: aggregate.provinceCode,
    relocationMode: aggregate.relocationMode,
    preferredRegions: aggregate.preferredRegions,
    preferredMajors: aggregate.preferredMajors,

    monthlyBudgetMin: aggregate.monthlyBudgetMin,
    monthlyBudgetMax: aggregate.monthlyBudgetMax,
    upfrontBudgetMax: aggregate.upfrontBudgetMax,
    housingMode: aggregate.housingMode,

    pinnedPrograms: aggregate.pinnedPrograms,
    schoolSubjects: aggregate.schoolSubjects,
    consents: aggregate.consents,
  };
}

@Injectable()
export class ProfileService implements IProfileService {
  constructor(
    @Inject(IProfileRepository)
    private readonly repository: IProfileRepository,
    private readonly provisioning: ProfileProvisioningService,
  ) {}

  async getProfile(userId: string): Promise<ProfileSnapshot> {
    const aggregate = await this.repository.findByUserId(userId);

    if (aggregate === null) {
      throw notFound('Profile not found');
    }

    return toSnapshot(aggregate);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<ProfileSnapshot> {
    // Read before writing so the 409 can report the version the caller should
    // have sent. The authoritative check still happens in the repository's
    // WHERE clause, which is what actually makes the write race-safe.
    const current = await this.repository.findByUserId(userId);

    if (current === null) {
      throw notFound('Profile not found');
    }

    if (current.version !== input.expectedVersion) {
      throw versionConflict(input.expectedVersion, current.version);
    }

    const updated = await this.repository.updateWithVersion(userId, input);

    if (updated === null) {
      // Lost the race between the read above and the write. Re-read so the 409
      // reports the version that actually won.
      const latest = await this.repository.findByUserId(userId);

      throw versionConflict(
        input.expectedVersion,
        latest?.version ?? current.version + 1,
      );
    }

    return toSnapshot(updated);
  }

  async deleteAccountData(userId: string): Promise<void> {
    const removed = await this.repository.deleteAccountData(userId);

    if (!removed) {
      throw notFound('Profile not found');
    }

    // The provisioning cache still claims this account has a row, so drop it
    // and let the next request provision a fresh empty profile.
    this.provisioning.forget(userId);
  }
}
