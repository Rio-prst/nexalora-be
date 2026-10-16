import type {
  AcademicSubjectRecord,
  ConsentRecord,
} from '../dto/profile.response.dto.js';
import type { UpdateProfileDto } from '../dto/update-profile.dto.js';

export interface ProfileRecord {
  userId: string;
  version: number;
  displayName: string | null;
  gradeLevel: string | null;
  graduationYear: number | null;
  cityCode: string | null;
  provinceCode: string | null;
  relocationMode: string | null;
  preferredRegions: string[];
  preferredMajors: string[];
  monthlyBudgetMin: number | null;
  monthlyBudgetMax: number | null;
  upfrontBudgetMax: number | null;
  housingMode: string | null;
  pinnedPrograms: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileAggregate extends ProfileRecord {
  schoolSubjects: AcademicSubjectRecord[];
  consents: ConsentRecord[];
}

export type UpdateProfileInput = Omit<
  UpdateProfileDto,
  | 'consent'
  | 'schoolSubjects'
  | 'pinnedPrograms'
  | 'preferredRegions'
  | 'preferredMajors'
> & {
  consent?: { purposeVersion: string; isAccepted: boolean };
  schoolSubjects?: {
    subject: string;
    semester: number;
    score: number;
    scale: string;
  }[];
  pinnedPrograms?: string[];
  preferredRegions?: string[];
  preferredMajors?: string[];
};

export interface IProfileRepository {
  /** Idempotent. Creates an empty profile row if none exists yet. */
  ensureExists(userId: string): Promise<void>;

  findByUserId(userId: string): Promise<ProfileAggregate | null>;

  /**
   * Applies a versioned update inside a single transaction.
   *
   * `userId` is a separate argument on purpose: it comes from the verified
   * token, never from the request body, so a caller cannot address another
   * account's row by crafting a payload.
   *
   * Returns null when the version no longer matches, which the service turns
   * into a 409.
   */
  updateWithVersion(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<ProfileAggregate | null>;

  deleteAccountData(userId: string): Promise<boolean>;
}

export const IProfileRepository = Symbol('IProfileRepository');
