import type { ProfileSnapshot } from '../dto/profile.response.dto.js';
import type { UpdateProfileDto } from '../dto/update-profile.dto.js';

export interface IProfileService {
  getProfile(userId: string): Promise<ProfileSnapshot>;
  updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<ProfileSnapshot>;
  deleteAccountData(userId: string): Promise<void>;
}

export const IProfileService = Symbol('IProfileService');
