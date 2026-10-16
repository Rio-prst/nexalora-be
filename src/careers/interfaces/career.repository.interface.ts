export type SalaryRange = {
  min: number | null;
  max: number | null;
  currency: 'IDR';
  verified: boolean;
};

export type CareerSummary = {
  id: string;
  title: string;
  summary: string;
  activities: unknown;
  industry: string | null;
  outlook: string | null;
  salaryRange: SalaryRange;
  relatedMajors: Array<{ id: string; name: string }>;
};

export type CareerDetail = CareerSummary & {
  challenges: unknown;
  skills: Array<{ id: string; name: string; description: string }>;
};

export interface ICareerRepository {
  listPublished(): Promise<CareerSummary[]>;
  findPublished(id: string): Promise<CareerDetail | null>;
}

export const ICareerRepository = Symbol('ICareerRepository');
