import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  IPassportRepository,
  NewPassport,
  PassportRecord,
  PassportSnapshotPayload,
  PassportSource,
} from './interfaces/passport.repository.interface.js';

function section(value: unknown): unknown {
  return value;
}

@Injectable()
export class PassportRepository implements IPassportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadSources(ownerId: string): Promise<PassportSource | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: ownerId },
      select: {
        displayName: true,
        gradeLevel: true,
        graduationYear: true,
        cityCode: true,
        provinceCode: true,
        relocationMode: true,
        preferredRegionsJson: true,
        preferredMajorsJson: true,
        monthlyBudgetMin: true,
        monthlyBudgetMax: true,
        upfrontBudgetMax: true,
        housingMode: true,
        academicRecords: {
          select: { subject: true, semester: true, score: true, scale: true },
        },
        interestSubmissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { id: true, instrumentVersion: true, answersJson: true },
        },
        recommendationRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, ruleVersion: true, resultsJson: true },
        },
        reflections: {
          where: { isActive: true },
          select: { id: true, responsesJson: true },
        },
        attempts: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, missionId: true, status: true, resultJson: true },
        },
        plans: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            id: true,
            version: true,
            weeklyMinutes: true,
            tasks: {
              select: { id: true, title: true, status: true, dueDate: true },
            },
          },
        },
      },
    });

    if (!profile) return null;

    const interest = profile.interestSubmissions[0];
    const run = profile.recommendationRuns[0];
    const plan = profile.plans[0];

    return {
      profile: section({
        displayName: profile.displayName,
        gradeLevel: profile.gradeLevel,
        graduationYear: profile.graduationYear,
        cityCode: profile.cityCode,
        provinceCode: profile.provinceCode,
        relocationMode: profile.relocationMode,
        preferredRegions: profile.preferredRegionsJson,
        preferredMajors: profile.preferredMajorsJson,
      }) as Record<string, unknown>,
      academicRecords: profile.academicRecords,
      budget: section({
        monthlyBudgetMin: profile.monthlyBudgetMin,
        monthlyBudgetMax: profile.monthlyBudgetMax,
        upfrontBudgetMax: profile.upfrontBudgetMax,
        housingMode: profile.housingMode,
      }) as Record<string, unknown>,
      interests: section(
        interest
          ? {
              id: interest.id,
              instrumentVersion: interest.instrumentVersion,
              answers: interest.answersJson,
            }
          : null,
      ),
      recommendations: section(
        run
          ? {
              id: run.id,
              ruleVersion: run.ruleVersion,
              results: run.resultsJson,
            }
          : null,
      ),
      reflections: section(profile.reflections),
      simulations: section(profile.attempts),
      plans: section(plan ?? null),
    };
  }

  async insert(passport: NewPassport): Promise<PassportRecord> {
    const row = await this.prisma.passport.create({
      data: {
        ownerId: passport.ownerId,
        snapshotJson: passport.snapshot as never,
        redactionsJson: passport.redactions as never,
      },
      select: {
        id: true,
        ownerId: true,
        snapshotJson: true,
        redactionsJson: true,
        createdAt: true,
      },
    });

    return {
      id: row.id,
      ownerId: row.ownerId,
      snapshot: (row.snapshotJson ?? {}) as PassportSnapshotPayload,
      redactions: Array.isArray(row.redactionsJson)
        ? (row.redactionsJson as PassportRecord['redactions'])
        : [],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findOwned(ownerId: string, id: string): Promise<PassportRecord | null> {
    const row = await this.prisma.passport.findFirst({
      where: { id, ownerId },
      select: {
        id: true,
        ownerId: true,
        snapshotJson: true,
        redactionsJson: true,
        createdAt: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      ownerId: row.ownerId,
      snapshot: (row.snapshotJson ?? {}) as PassportSnapshotPayload,
      redactions: Array.isArray(row.redactionsJson)
        ? (row.redactionsJson as PassportRecord['redactions'])
        : [],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
