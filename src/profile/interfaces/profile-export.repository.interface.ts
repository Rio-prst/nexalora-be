export type AccountDataExport = {
  schemaVersion: string;
  exportedAt: string;
  owner: {
    userId: string;
    profileVersion: number;
    createdAt: string;
  };
  profile: Record<string, unknown>;
  consents: Array<Record<string, unknown>>;
  academicRecords: Array<Record<string, unknown>>;
  interestSubmissions: Array<Record<string, unknown>>;
  recommendationRuns: Array<Record<string, unknown>>;
  attempts: Array<Record<string, unknown>>;
  reflections: Array<Record<string, unknown>>;
  plans: Array<Record<string, unknown>>;
  passports: Array<Record<string, unknown>>;
};

export const EXPORT_SCHEMA_VERSION = '1.0';

export interface IProfileExportRepository {
  loadAll(userId: string): Promise<AccountDataExport | null>;
}

export const IProfileExportRepository = Symbol('IProfileExportRepository');
