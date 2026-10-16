import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  IComparisonRepository,
  NewScenario,
  ScenarioBaseline,
  ScenarioCostProfile,
  ShortlistSnapshot,
} from './interfaces/comparison.repository.interface.js';

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

@Injectable()
export class ComparisonRepository implements IComparisonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findShortlist(userId: string): Promise<ShortlistSnapshot | null> {
    const row = await this.prisma.shortlist.findUnique({
      where: { userId },
      select: { programIdsJson: true, baseVersion: true, updatedAt: true },
    });

    if (!row) return null;

    return {
      programIds: readStringArray(row.programIdsJson),
      baseVersion: row.baseVersion,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async saveShortlist(
    userId: string,
    programIds: string[],
    baseVersion: number,
  ): Promise<ShortlistSnapshot> {
    const row = await this.prisma.shortlist.upsert({
      where: { userId },
      create: { userId, programIdsJson: programIds, baseVersion },
      update: { programIdsJson: programIds, baseVersion },
      select: { programIdsJson: true, baseVersion: true, updatedAt: true },
    });

    return {
      programIds: readStringArray(row.programIdsJson),
      baseVersion: row.baseVersion,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findBaseline(userId: string): Promise<ScenarioBaseline | null> {
    const row = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        version: true,
        monthlyBudgetMax: true,
        upfrontBudgetMax: true,
        housingMode: true,
        relocationMode: true,
      },
    });

    if (!row) return null;

    return {
      profileVersion: row.version,
      monthlyBudgetMax: row.monthlyBudgetMax,
      upfrontBudgetMax: row.upfrontBudgetMax,
      housingMode: row.housingMode ?? null,
      relocationMode: row.relocationMode ?? null,
    };
  }

  async listPublishedCosts(
    programIds: readonly string[],
  ): Promise<ScenarioCostProfile[]> {
    if (programIds.length === 0) return [];

    const rows = await this.prisma.program.findMany({
      where: {
        id: { in: [...programIds] },
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      select: {
        id: true,
        costProfiles: {
          select: {
            academicYear: true,
            componentsJson: true,
            source: { select: { applicableYear: true } },
          },
          orderBy: [{ academicYear: 'desc' }],
        },
      },
    });

    return rows
      .map((row) => {
        const latest = row.costProfiles[0];
        if (!latest) return null;

        const raw =
          typeof latest.componentsJson === 'object' &&
          latest.componentsJson !== null
            ? (latest.componentsJson as Record<string, unknown>)
            : {};

        return {
          programId: row.id,
          components: {
            tuitionPerSemester: raw[
              'tuitionPerSemester'
            ] as ScenarioCostProfile['components']['tuitionPerSemester'],
            livingCostMonthly: raw[
              'livingCostMonthly'
            ] as ScenarioCostProfile['components']['livingCostMonthly'],
            recurringSupportMonthly: raw[
              'recurringSupportMonthly'
            ] as ScenarioCostProfile['components']['recurringSupportMonthly'],
            upfrontCost: raw[
              'upfrontCost'
            ] as ScenarioCostProfile['components']['upfrontCost'],
          },
          sourceYear: latest.source?.applicableYear ?? 2026,
        } satisfies ScenarioCostProfile;
      })
      .filter((entry): entry is ScenarioCostProfile => entry !== null);
  }

  async insertScenario(
    scenario: NewScenario,
  ): Promise<{ id: string; createdAt: string }> {
    const row = await this.prisma.scenario.create({
      data: {
        userId: scenario.userId,
        baseProfileVersion: scenario.baseProfileVersion,
        overridesJson: scenario.overrides as never,
        resultsJson: scenario.results as never,
      },
      select: { id: true, createdAt: true },
    });

    return { id: row.id, createdAt: row.createdAt.toISOString() };
  }
}
