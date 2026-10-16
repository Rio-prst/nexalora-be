export interface AcademicSubjectRecord {
  subject: string;
  semester: number;
  score: number;
  scale: string;
}

export interface ConsentRecord {
  purposeVersion: string;
  isAccepted: boolean;
  consentedAt: string;
}

export interface ProfileSnapshot {
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
  schoolSubjects: AcademicSubjectRecord[];
  consents: ConsentRecord[];
}
