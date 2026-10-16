import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  CareerDetail,
  CareerSummary,
  ICareerRepository,
  SalaryRange,
} from './interfaces/career.repository.interface.js';

function readRange(min: number | null, max: number | null): SalaryRange {
  return { min, max, currency: 'IDR', verified: min !== null && max !== null };
}

function readList(value: unknown): unknown {
  if (!Array.isArray(value)) return [];
  return value;
}

const SUMMARY_SELECT = {
  id: true,
  title: true,
  summary: true,
  activitiesJson: true,
  industry: true,
  salaryRangeMin: true,
  salaryRangeMax: true,
  outlook: true,
  careerMajors: {
    select: { major: { select: { id: true, name: true } } },
  },
} as const;

@Injectable()
export class CareerRepository implements ICareerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<CareerSummary[]> {
    const rows = await this.prisma.career.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      select: SUMMARY_SELECT,
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      activities: readList(row.activitiesJson),
      industry: row.industry,
      outlook: row.outlook,
      salaryRange: readRange(row.salaryRangeMin, row.salaryRangeMax),
      relatedMajors: row.careerMajors.map((mapping) => mapping.major),
    }));
  }

  async findPublished(id: string): Promise<CareerDetail | null> {
    const row = await this.prisma.career.findFirst({
      where: {
        id,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      select: {
        ...SUMMARY_SELECT,
        challengesJson: true,
        careerSkills: {
          select: {
            skill: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      activities: readList(row.activitiesJson),
      industry: row.industry,
      outlook: row.outlook,
      salaryRange: readRange(row.salaryRangeMin, row.salaryRangeMax),
      relatedMajors: row.careerMajors.map((mapping) => mapping.major),
      challenges: readList(row.challengesJson),
      skills: row.careerSkills.map((mapping) => mapping.skill),
    };
  }
}
