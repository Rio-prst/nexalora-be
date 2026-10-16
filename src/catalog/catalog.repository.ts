import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  CatalogMajor,
  CatalogProgram,
} from './dto/catalog-list.response.dto.js';
import type { CostComponents } from './dto/catalog-list.response.dto.js';
import type {
  ICatalogRepository,
  StoredProgramDetail,
} from './interfaces/catalog.repository.interface.js';

const PROGRAM_INCLUDE = {
  major: { select: { id: true, name: true, publicationStatus: true } },
  university: {
    select: { id: true, name: true, cityCode: true, provinceCode: true },
  },
  source: {
    select: {
      id: true,
      publisher: true,
      title: true,
      applicableYear: true,
      checkedAt: true,
      url: true,
      reviewStatus: true,
    },
  },
} as const;

@Injectable()
export class CatalogRepository implements ICatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishedPrograms(): Promise<CatalogProgram[]> {
    const rows = await this.prisma.program.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      include: PROGRAM_INCLUDE,
      orderBy: [{ majorId: 'asc' }, { id: 'asc' }],
    });

    return rows
      .filter(
        (row) => row.major.publicationStatus === PublicationStatus.PUBLISHED,
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        degree: row.degree,
        campusLocation: row.campusLocation,
        admissionPaths: row.admissionPathsJson,
        major: { id: row.major.id, name: row.major.name },
        university: {
          id: row.university.id,
          name: row.university.name,
          cityCode: row.university.cityCode,
          provinceCode: row.university.provinceCode,
        },
        evidence: {
          sourceId: row.source.id,
          publisher: row.source.publisher,
          title: row.source.title,
          applicableYear: row.source.applicableYear,
          checkedAt: row.source.checkedAt.toISOString(),
          url: row.source.url,
          reviewStatus: row.source.reviewStatus,
        },
      }));
  }

  async listPublishedMajors(): Promise<CatalogMajor[]> {
    const rows = await this.prisma.major.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      select: { id: true, name: true, summary: true, prepSubjectsJson: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      summary: row.summary,
      prepSubjects: Array.isArray(row.prepSubjectsJson)
        ? (row.prepSubjectsJson as string[])
        : [],
    }));
  }

  async findPublishedProgram(id: string): Promise<StoredProgramDetail | null> {
    const row = await this.prisma.program.findFirst({
      where: {
        id,
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      include: {
        ...PROGRAM_INCLUDE,
        costProfiles: {
          include: {
            source: {
              select: {
                id: true,
                publisher: true,
                title: true,
                applicableYear: true,
                checkedAt: true,
                url: true,
                reviewStatus: true,
              },
            },
          },
          orderBy: [{ academicYear: 'desc' }, { version: 'asc' }],
        },
        curricula: {
          include: {
            source: {
              select: {
                id: true,
                publisher: true,
                title: true,
                applicableYear: true,
                checkedAt: true,
                url: true,
                reviewStatus: true,
              },
            },
          },
          orderBy: [{ curriculumYear: 'desc' }, { version: 'asc' }],
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      degree: row.degree,
      campusLocation: row.campusLocation,
      admissionPaths: row.admissionPathsJson,
      major: { id: row.major.id, name: row.major.name },
      university: {
        id: row.university.id,
        name: row.university.name,
        cityCode: row.university.cityCode,
        provinceCode: row.university.provinceCode,
      },
      evidence: {
        sourceId: row.source.id,
        publisher: row.source.publisher,
        title: row.source.title,
        applicableYear: row.source.applicableYear,
        checkedAt: row.source.checkedAt.toISOString(),
        url: row.source.url,
        reviewStatus: row.source.reviewStatus,
      },
      costProfiles: row.costProfiles.map((profile) => ({
        academicYear: profile.academicYear,
        admissionTrack: profile.admissionTrack,
        housingMode: profile.housingMode,
        version: profile.version,
        components: normalizeComponents(profile.componentsJson),
        evidence: {
          sourceId: profile.source.id,
          publisher: profile.source.publisher,
          title: profile.source.title,
          applicableYear: profile.source.applicableYear,
          checkedAt: profile.source.checkedAt.toISOString(),
          url: profile.source.url,
          reviewStatus: profile.source.reviewStatus,
        },
      })),
      curricula: row.curricula.map((curriculum) => ({
        curriculumYear: curriculum.curriculumYear,
        version: curriculum.version,
        rules: curriculum.rulesJson,
        evidence: {
          sourceId: curriculum.source.id,
          publisher: curriculum.source.publisher,
          title: curriculum.source.title,
          applicableYear: curriculum.source.applicableYear,
          checkedAt: curriculum.source.checkedAt.toISOString(),
          url: curriculum.source.url,
          reviewStatus: curriculum.source.reviewStatus,
        },
      })),
    };
  }
}

type RawComponents = Record<string, unknown>;

function normalizeComponents(raw: unknown): CostComponents {
  const source: RawComponents =
    typeof raw === 'object' && raw !== null ? (raw as RawComponents) : {};

  return {
    tuitionPerSemester: readRange(source['tuitionPerSemester']),
    livingCostMonthly: readRange(source['livingCostMonthly']),
    recurringSupportMonthly: readRange(source['recurringSupportMonthly']),
    upfrontCost: readRange(source['upfrontCost']),
  };
}

function readRange(
  value: unknown,
): { min: number | null; max: number | null } | null {
  if (typeof value !== 'object' || value === null) return null;

  const range = value as RawComponents;

  return {
    min: typeof range['min'] === 'number' ? range['min'] : null,
    max: typeof range['max'] === 'number' ? range['max'] : null,
  };
}
