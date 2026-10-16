import type {
  CatalogEvidence,
  CatalogMajor,
  CatalogProgram,
  CostComponents,
} from '../dto/catalog-list.response.dto.js';

export interface StoredCurriculum {
  curriculumYear: number;
  version: string;
  rules: unknown;
  evidence: CatalogEvidence;
}

export interface StoredCostProfile {
  academicYear: number;
  admissionTrack: string;
  housingMode: string;
  version: string;
  components: CostComponents;
  evidence: CatalogEvidence;
}

export interface StoredProgramDetail extends CatalogProgram {
  costProfiles: StoredCostProfile[];
  curricula: StoredCurriculum[];
}

export interface ICatalogRepository {
  listPublishedPrograms(): Promise<CatalogProgram[]>;
  listPublishedMajors(): Promise<CatalogMajor[]>;
  findPublishedProgram(id: string): Promise<StoredProgramDetail | null>;
}

export const ICatalogRepository = Symbol('ICatalogRepository');
