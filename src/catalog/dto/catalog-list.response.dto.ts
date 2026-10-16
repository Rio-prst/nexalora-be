export interface CatalogEvidence {
  sourceId: string;
  publisher: string;
  title: string;
  applicableYear: number;
  checkedAt: string;
  url: string;
  reviewStatus: string;
}

export interface CostRange {
  min: number | null;
  max: number | null;
}

export interface CostComponents {
  tuitionPerSemester: CostRange | null;
  livingCostMonthly: CostRange | null;
  recurringSupportMonthly: CostRange | null;
  upfrontCost: CostRange | null;
}

export interface CostProfileRecord {
  academicYear: number;
  admissionTrack: string;
  housingMode: string;
  version: string;
  components: CostComponents;
  evidence: CatalogEvidence;
}

export interface CurriculumRecord {
  curriculumYear: number;
  version: string;
  freshness: 'CURRENT' | 'STALE';
  rules: unknown;
  evidence: CatalogEvidence;
}

export interface CatalogMajor {
  id: string;
  name: string;
  summary: string;
  prepSubjects: string[];
}

export interface CatalogProgram {
  id: string;
  name: string;
  degree: string;
  campusLocation: string;
  admissionPaths: unknown;
  major: { id: string; name: string };
  university: {
    id: string;
    name: string;
    cityCode: string;
    provinceCode: string;
  };
  evidence: CatalogEvidence;
}

export interface CatalogList {
  majors: CatalogMajor[];
  programs: CatalogProgram[];
}

export interface ProgramDetailRecord extends CatalogProgram {
  costProfiles: CostProfileRecord[];
  curricula: CurriculumRecord[];
}
