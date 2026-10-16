import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type { InterestAnswer } from '../interests/dto/interest-answer.dto.js';
import { computeCoverage } from '../interests/interest-coverage.js';
import type { CostComponents } from './dto/recommendation-run.response.dto.js';
import type {
  IRecommendationRepository,
  NewRecommendationRun,
  StoredCatalogMajor,
  StoredCatalogProgram,
  StoredInterestAnswers,
  StoredProfile,
  StoredRecommendationRun,
  StoredReflection,
} from './interfaces/recommendation.repository.interface.js';

const DEFAULT_ACADEMIC_YEAR = 2026;

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readComponents(value: unknown): CostComponents {
  const raw =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    tuitionPerSemester: raw[
      'tuitionPerSemester'
    ] as CostComponents['tuitionPerSemester'],
    livingCostMonthly: raw[
      'livingCostMonthly'
    ] as CostComponents['livingCostMonthly'],
    recurringSupportMonthly: raw[
      'recurringSupportMonthly'
    ] as CostComponents['recurringSupportMonthly'],
    upfrontCost: raw['upfrontCost'] as CostComponents['upfrontCost'],
  };
}

@Injectable()
export class RecommendationRepository implements IRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: string): Promise<StoredProfile | null> {
    const row = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        version: true,
        monthlyBudgetMax: true,
        upfrontBudgetMax: true,
        pinnedProgramsJson: true,
        academicRecords: { select: { subject: true } },
      },
    });

    if (!row) return null;

    return {
      version: row.version,
      monthlyBudgetMax: row.monthlyBudgetMax,
      upfrontBudgetMax: row.upfrontBudgetMax,
      pinnedPrograms: readStringArray(row.pinnedProgramsJson),
      recordedSubjects: [
        ...new Set(row.academicRecords.map((record) => record.subject)),
      ],
    };
  }

  async findLatestInterestSubmission(
    userId: string,
  ): Promise<StoredInterestAnswers | null> {
    const row = await this.prisma.interestSubmission.findFirst({
      where: { userId },
      orderBy: [{ submittedAt: 'desc' }],
      select: { id: true, answersJson: true },
    });

    if (!row) return null;

    const answers = row.answersJson as unknown as InterestAnswer[];
    const numericByDimension: Record<string, number[]> = {};

    for (const answer of answers) {
      if (answer.state !== 'ANSWERED') continue;
      const bucket = numericByDimension[answer.dimension] ?? [];
      bucket.push(answer.value);
      numericByDimension[answer.dimension] = bucket;
    }

    return {
      submissionId: row.id,
      coverage: computeCoverage(answers),
      numericByDimension,
    };
  }

  async listPublishedMajors(): Promise<StoredCatalogMajor[]> {
    const rows = await this.prisma.major.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      select: {
        id: true,
        heuristicWeightsJson: true,
        prepSubjectsJson: true,
      },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      weights:
        typeof row.heuristicWeightsJson === 'object' &&
        row.heuristicWeightsJson !== null
          ? (row.heuristicWeightsJson as Record<string, unknown>)
          : {},
      prepSubjects: readStringArray(row.prepSubjectsJson),
    }));
  }

  async listPublishedPrograms(
    pinnedPrograms: readonly string[],
  ): Promise<StoredCatalogProgram[]> {
    const pinned = new Set(pinnedPrograms);

    const rows = await this.prisma.program.findMany({
      where: {
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      select: {
        id: true,
        majorId: true,
        costProfiles: {
          select: {
            academicYear: true,
            componentsJson: true,
            source: { select: { applicableYear: true } },
          },
          orderBy: [{ academicYear: 'desc' }],
        },
      },
      orderBy: [{ majorId: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => {
      const latest = row.costProfiles[0];

      return {
        id: row.id,
        majorId: row.majorId,
        pinnedByStudent: pinned.has(row.id),
        costProfiles:
          latest === undefined
            ? []
            : [
                {
                  academicYear: latest.academicYear,
                  components: readComponents(latest.componentsJson),
                  sourceYear:
                    latest.source?.applicableYear ?? DEFAULT_ACADEMIC_YEAR,
                },
              ],
      };
    });
  }

  async findActiveReflections(
    userId: string,
    ids: readonly string[],
  ): Promise<StoredReflection[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.reflection.findMany({
      where: {
        userId,
        id: { in: [...ids] },
        isActive: true,
      },
      select: {
        id: true,
        responsesJson: true,
        attempt: { select: { mission: { select: { majorId: true } } } },
      },
    });

    return rows.map((row) => {
      const responses =
        typeof row.responsesJson === 'object' && row.responsesJson !== null
          ? (row.responsesJson as Record<string, unknown>)
          : {};

      const raw = responses['continueInterest'];

      return {
        id: row.id,
        majorId: row.attempt.mission.majorId,
        continueInterest: typeof raw === 'number' ? raw : null,
      };
    });
  }

  async insertRun(run: NewRecommendationRun): Promise<StoredRecommendationRun> {
    const row = await this.prisma.recommendationRun.create({
      data: {
        userId: run.userId,
        profileVersion: run.profileVersion,
        ruleVersion: run.ruleVersion,
        catalogVersion: run.catalogVersion,
        inputsSnapshotJson: run.inputsSnapshot as never,
        resultsJson: run.results as never,
      },
      select: {
        id: true,
        ruleVersion: true,
        catalogVersion: true,
        profileVersion: true,
        resultsJson: true,
        createdAt: true,
      },
    });

    return {
      id: row.id,
      ruleVersion: row.ruleVersion,
      catalogVersion: row.catalogVersion,
      profileVersion: row.profileVersion,
      results: row.resultsJson,
      createdAt: row.createdAt,
    };
  }

  async findLatestRun(userId: string): Promise<StoredRecommendationRun | null> {
    const row = await this.prisma.recommendationRun.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        ruleVersion: true,
        catalogVersion: true,
        profileVersion: true,
        resultsJson: true,
        createdAt: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      ruleVersion: row.ruleVersion,
      catalogVersion: row.catalogVersion,
      profileVersion: row.profileVersion,
      results: row.resultsJson,
      createdAt: row.createdAt,
    };
  }
}
