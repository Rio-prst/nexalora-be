import type { InterestCoverage } from '../../interests/interest-coverage.js';
import type {
  AcademicReadinessStatus,
  CostComponents,
  ExperienceStatus,
} from '../dto/recommendation-run.response.dto.js';

export type StoredProfile = {
  version: number;
  monthlyBudgetMax: number | null;
  upfrontBudgetMax: number | null;
  pinnedPrograms: string[];
  recordedSubjects: string[];
};

export type StoredCatalogMajor = {
  id: string;
  weights: Record<string, unknown>;
  prepSubjects: string[];
};

export type StoredCatalogProgram = {
  id: string;
  majorId: string;
  pinnedByStudent: boolean;
  costProfiles: Array<{
    academicYear: number;
    components: CostComponents;
    sourceYear: number;
  }>;
};

export type StoredInterestAnswers = {
  submissionId: string;
  coverage: InterestCoverage;
  numericByDimension: Record<string, number[]>;
};

export type StoredReflection = {
  id: string;
  majorId: string;
  continueInterest: number | null;
};

export type RecommendationInputs = {
  profile: StoredProfile;
  interest: StoredInterestAnswers | null;
  majors: StoredCatalogMajor[];
  programs: StoredCatalogProgram[];
  reflections: StoredReflection[];
};

export type ExperienceByMajor = Record<string, ExperienceStatus>;

export type AcademicByProgram = Record<string, AcademicReadinessStatus>;

export type NewRecommendationRun = {
  userId: string;
  profileVersion: number;
  ruleVersion: string;
  catalogVersion: string;
  inputsSnapshot: unknown;
  results: unknown;
};

export type StoredRecommendationRun = {
  id: string;
  ruleVersion: string;
  catalogVersion: string;
  profileVersion: number;
  results: unknown;
  createdAt: Date;
};

export interface IRecommendationRepository {
  findProfile(userId: string): Promise<StoredProfile | null>;
  findLatestInterestSubmission(
    userId: string,
  ): Promise<StoredInterestAnswers | null>;
  listPublishedMajors(): Promise<StoredCatalogMajor[]>;
  listPublishedPrograms(
    pinnedPrograms: readonly string[],
  ): Promise<StoredCatalogProgram[]>;
  findActiveReflections(
    userId: string,
    ids: readonly string[],
  ): Promise<StoredReflection[]>;
  insertRun(run: NewRecommendationRun): Promise<StoredRecommendationRun>;
  findLatestRun(userId: string): Promise<StoredRecommendationRun | null>;
}

export const IRecommendationRepository = Symbol('IRecommendationRepository');
