import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '../common/errors/app-error.js';
import { CURRICULUM_STALE_YEARS } from './catalog.constants.js';
import type {
  CatalogList,
  CurriculumRecord,
  ProgramDetailRecord,
} from './dto/catalog-list.response.dto.js';
import { ICatalogRepository } from './interfaces/catalog.repository.interface.js';
import type { ICatalogService } from './interfaces/catalog.service.interface.js';

export function isCurriculumStale(curriculumYear: number, now: Date): boolean {
  return curriculumYear < now.getUTCFullYear() - CURRICULUM_STALE_YEARS;
}

@Injectable()
export class CatalogService implements ICatalogService {
  constructor(
    @Inject(ICatalogRepository)
    private readonly repository: ICatalogRepository,
  ) {}

  async list(): Promise<CatalogList> {
    const [majors, programs] = await Promise.all([
      this.repository.listPublishedMajors(),
      this.repository.listPublishedPrograms(),
    ]);

    return { majors, programs };
  }

  async getProgram(id: string): Promise<ProgramDetailRecord> {
    const stored = await this.repository.findPublishedProgram(id);

    if (!stored) {
      throw notFound('Program not found or not published');
    }

    const { curricula, costProfiles, ...program } = stored;
    const now = new Date();

    return {
      ...program,
      costProfiles,
      curricula: curricula.map<CurriculumRecord>((curriculum) => ({
        ...curriculum,
        freshness: isCurriculumStale(curriculum.curriculumYear, now)
          ? 'STALE'
          : 'CURRENT',
      })),
    };
  }
}
