export type UniversitySummary = {
  id: string;
  name: string;
  cityCode: string;
  provinceCode: string;
  officialWebsite: string;
  accreditation: string | null;
  institutionType: string | null;
  programCount: number;
};

export type UktRange = {
  min: number | null;
  max: number | null;
  verified: boolean;
};

export type StudyProgramSummary = {
  id: string;
  name: string;
  degree: string;
  campusLocation: string;
  major: { id: string; name: string };
  university: { id: string; name: string };
  quota: number | null;
  passingGradeSnbt: number | null;
  uktRange: UktRange;
};

export type StudyProgramDetail = StudyProgramSummary & {
  admissionPaths: unknown;
  relatedCareers: Array<{
    id: string;
    title: string;
    salaryRange: UktRange;
  }>;
  featuredCourses: Array<{ name: string; note: string | null }>;
  scholarships: Array<{ id: string; name: string; status: string }>;
};

export interface ICatalogDirectoryRepository {
  listUniversities(): Promise<UniversitySummary[]>;
  listStudyPrograms(): Promise<StudyProgramSummary[]>;
  findStudyProgram(slugOrId: string): Promise<StudyProgramDetail | null>;
}

export const ICatalogDirectoryRepository = Symbol(
  'ICatalogDirectoryRepository',
);
