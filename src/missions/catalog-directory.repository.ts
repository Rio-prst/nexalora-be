import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  ICatalogDirectoryRepository,
  StudyProgramDetail,
  StudyProgramSummary,
  UktRange,
  UniversitySummary,
} from './interfaces/catalog-directory.repository.interface.js';

function readList(value: unknown): unknown {
  return Array.isArray(value) ? value : [];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PROGRAM_SELECT = {
  id: true,
  name: true,
  degree: true,
  campusLocation: true,
  quota: true,
  passingGradeSnbt: true,
  uktRangeMin: true,
  uktRangeMax: true,
  major: { select: { id: true, name: true } },
  university: {
    select: {
      id: true,
      name: true,
      accreditation: true,
      institutionType: true,
    },
  },
} as const;

function toUktRange(min: number | null, max: number | null): UktRange {
  return { min, max, verified: min !== null && max !== null };
}

@Injectable()
export class CatalogDirectoryRepository implements ICatalogDirectoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listUniversities(): Promise<UniversitySummary[]> {
    const rows = await this.prisma.university.findMany({
      select: {
        id: true,
        name: true,
        cityCode: true,
        provinceCode: true,
        officialWebsite: true,
        accreditation: true,
        institutionType: true,
        _count: { select: { programs: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      cityCode: row.cityCode,
      provinceCode: row.provinceCode,
      officialWebsite: row.officialWebsite,
      accreditation: row.accreditation,
      institutionType: row.institutionType,
      programCount: row._count.programs,
    }));
  }

  async listStudyPrograms(): Promise<StudyProgramSummary[]> {
    const rows = await this.prisma.program.findMany({
      where: {
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      select: PROGRAM_SELECT,
      orderBy: [{ universityId: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      degree: row.degree,
      campusLocation: row.campusLocation,
      major: row.major,
      university: row.university,
      quota: row.quota,
      passingGradeSnbt: row.passingGradeSnbt,
      uktRange: toUktRange(row.uktRangeMin, row.uktRangeMax),
    }));
  }

  async findStudyProgram(slugOrId: string): Promise<StudyProgramDetail | null> {
    const rows = await this.prisma.program.findMany({
      where: {
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      select: {
        ...PROGRAM_SELECT,
        admissionPathsJson: true,
        university: {
          select: {
            id: true,
            name: true,
            accreditation: true,
            institutionType: true,
          },
        },
        curricula: {
          select: { rulesJson: true },
          orderBy: [{ curriculumYear: 'desc' }],
          take: 1,
        },
        major: {
          select: {
            id: true,
            name: true,
            prepSubjectsJson: true,
            careerMajors: {
              select: {
                career: {
                  select: {
                    id: true,
                    title: true,
                    salaryRangeMin: true,
                    salaryRangeMax: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const match =
      rows.find((row) => row.id === slugOrId) ??
      rows.find((row) => slugify(row.name) === slugOrId.toLowerCase()) ??
      rows.find(
        (row) =>
          slugify(`${row.university.name} ${row.name}`) ===
          slugOrId.toLowerCase(),
      );

    if (!match) return null;

    const latestRules = match.curricula[0]?.rulesJson;
    const featuredCourses = Array.isArray(latestRules)
      ? latestRules
          .filter(
            (
              group,
            ): group is { name?: string; group?: string; note?: string } =>
              typeof group === 'object' && group !== null,
          )
          .map((group) => ({
            name: group.group ?? '',
            note: typeof group.note === 'string' ? group.note : null,
          }))
          .filter((entry) => entry.name.length > 0)
      : [];

    return {
      id: match.id,
      name: match.name,
      degree: match.degree,
      campusLocation: match.campusLocation,
      major: { id: match.major.id, name: match.major.name },
      university: match.university,
      quota: match.quota,
      passingGradeSnbt: match.passingGradeSnbt,
      uktRange: toUktRange(match.uktRangeMin, match.uktRangeMax),
      admissionPaths: readList(match.admissionPathsJson),
      relatedCareers: match.major.careerMajors.map((mapping) => ({
        id: mapping.career.id,
        title: mapping.career.title,
        salaryRange: toUktRange(
          mapping.career.salaryRangeMin,
          mapping.career.salaryRangeMax,
        ),
      })),
      featuredCourses,
      scholarships: await this.listScholarshipsForSeniorHighSchool(),
    };
  }

  private async listScholarshipsForSeniorHighSchool(): Promise<
    Array<{ id: string; name: string; status: string }>
  > {
    const rows = await this.prisma.scholarship.findMany({
      select: { id: true, name: true, status: true, scopeJson: true },
      orderBy: { id: 'asc' },
    });

    return rows
      .filter((row) => {
        const scope = row.scopeJson;
        if (typeof scope !== 'object' || scope === null) return false;
        const stages = (scope as Record<string, unknown>)['stages'];
        if (!Array.isArray(stages)) return false;
        return stages.some(
          (stage) => typeof stage === 'string' && stage === 'S1',
        );
      })
      .map((row) => ({ id: row.id, name: row.name, status: row.status }));
  }
}
