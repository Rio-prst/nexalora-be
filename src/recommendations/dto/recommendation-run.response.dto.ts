export type CostRange = {
  min: number | null;
  max: number | null;
};

export type CostComponents = {
  tuitionPerSemester: CostRange | null;
  livingCostMonthly: CostRange | null;
  recurringSupportMonthly: CostRange | null;
  upfrontCost: CostRange | null;
};

export type CostFeasibilityStatus =
  | 'WITHIN_BUDGET'
  | 'DEPENDS_ON_SCENARIO'
  | 'NEEDS_FINANCIAL_AID'
  | 'INSUFFICIENT_DATA';

export type AcademicReadinessStatus = 'READY' | 'PARTIAL' | 'INCOMPLETE';

export type ExperienceStatus = 'TRIED' | 'NOT_TRIED';

export type ReasonCode =
  | 'ACTIVITY_INTEREST'
  | 'REFLECTION_CONTINUE'
  | 'PINNED_BY_STUDENT'
  | 'GENERAL_CATALOGUE';

export type Reason = {
  code: ReasonCode;
  evidenceId: string;
};

export type CostBreakdown = {
  monthlyEquivalentMin: number | null;
  monthlyEquivalentMax: number | null;
  upfrontMax: number | null;
  sourceYear: number;
};

export type MajorRecommendation = {
  majorId: string;
  experienceStatus: ExperienceStatus;
  reasons: Reason[];
};

export type ProgramRecommendation = {
  programId: string;
  isPinned: boolean;
  reasons: Reason[];
  academicStatus: AcademicReadinessStatus;
  costStatus: CostFeasibilityStatus;
  costBreakdown: CostBreakdown | null;
  admissionProbability: null;
};

export type RecommendationRunPayload = {
  runId: string;
  ruleVersion: string;
  catalogVersion: string;
  profileVersion: number;
  coverage: {
    answeredDimensions: number;
    isSufficientForPersonalization: boolean;
  };
  majors: MajorRecommendation[];
  items: ProgramRecommendation[];
};
