import type {
  CostFeasibilityStatus,
  CostRange,
} from '../../recommendations/dto/recommendation-run.response.dto.js';

export type ShortlistSnapshot = {
  programIds: string[];
  baseVersion: number;
  updatedAt: string;
};

export type ScenarioBaseline = {
  profileVersion: number;
  monthlyBudgetMax: number | null;
  upfrontBudgetMax: number | null;
  housingMode: string | null;
  relocationMode: string | null;
};

export type ScenarioProgramResult = {
  programId: string;
  baseline: CostFeasibilityStatus;
  scenario: CostFeasibilityStatus;
  monthlyEquivalentMin: number | null;
  monthlyEquivalentMax: number | null;
  upfrontMax: number | null;
  sourceYear: number;
};

export type ScenarioResult = {
  id: string;
  baseProfileVersion: number;
  overrides: unknown;
  programResults: ScenarioProgramResult[];
  persistedToProfile: false;
};

export type ScenarioCostProfile = {
  programId: string;
  components: {
    tuitionPerSemester: CostRange | null;
    livingCostMonthly: CostRange | null;
    recurringSupportMonthly: CostRange | null;
    upfrontCost: CostRange | null;
  };
  sourceYear: number;
};

export type NewScenario = {
  userId: string;
  baseProfileVersion: number;
  overrides: unknown;
  results: unknown;
};

export interface IComparisonRepository {
  findShortlist(userId: string): Promise<ShortlistSnapshot | null>;
  saveShortlist(
    userId: string,
    programIds: string[],
    baseVersion: number,
  ): Promise<ShortlistSnapshot>;
  findBaseline(userId: string): Promise<ScenarioBaseline | null>;
  listPublishedCosts(
    programIds: readonly string[],
  ): Promise<ScenarioCostProfile[]>;
  insertScenario(
    scenario: NewScenario,
  ): Promise<{ id: string; createdAt: string }>;
}

export const IComparisonRepository = Symbol('IComparisonRepository');
