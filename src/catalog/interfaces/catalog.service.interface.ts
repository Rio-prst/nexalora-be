import type {
  CatalogList,
  ProgramDetailRecord,
} from '../dto/catalog-list.response.dto.js';

export interface ICatalogService {
  list(): Promise<CatalogList>;
  getProgram(id: string): Promise<ProgramDetailRecord>;
}

export const ICatalogService = Symbol('ICatalogService');
