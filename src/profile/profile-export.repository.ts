import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import {
  EXPORT_SCHEMA_VERSION,
  type AccountDataExport,
  type IProfileExportRepository,
} from './interfaces/profile-export.repository.interface.js';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (typeof value !== 'object' || value === null) return {};
  return value as Row;
}

@Injectable()
export class ProfileExportRepository implements IProfileExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadAll(userId: string): Promise<AccountDataExport | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        userId: true,
        version: true,
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
        pinnedProgramsJson: true,
        createdAt: true,
        consents: {
          select: {
            purposeVersion: true,
            isAccepted: true,
            consentedAt: true,
          },
          orderBy: { consentedAt: 'asc' },
        },
        academicRecords: {
          select: {
            subject: true,
            semester: true,
            score: true,
            scale: true,
          },
          orderBy: [{ semester: 'asc' }, { subject: 'asc' }],
        },
        interestSubmissions: {
          select: {
            id: true,
            instrumentVersion: true,
            answersJson: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'asc' },
        },
        recommendationRuns: {
          select: {
            id: true,
            profileVersion: true,
            ruleVersion: true,
            catalogVersion: true,
            inputsSnapshotJson: true,
            resultsJson: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attempts: {
          select: {
            id: true,
            missionId: true,
            missionVersion: true,
            seed: true,
            status: true,
            artifactJson: true,
            resultJson: true,
            revision: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        reflections: {
          select: {
            id: true,
            attemptId: true,
            revision: true,
            responsesJson: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        plans: {
          select: {
            id: true,
            goalIdsJson: true,
            weeklyMinutes: true,
            startDate: true,
            version: true,
            status: true,
            createdAt: true,
            tasks: {
              select: {
                id: true,
                title: true,
                actionType: true,
                status: true,
                dueDate: true,
                evidenceNote: true,
                evidenceUrl: true,
              },
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        passports: {
          select: {
            id: true,
            snapshotJson: true,
            redactionsJson: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!profile) return null;

    const { userId: ownerId, version, createdAt, consents, ...rest } = profile;

    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      owner: {
        userId: ownerId,
        profileVersion: version,
        createdAt: createdAt.toISOString(),
      },
      profile: {
        displayName: rest.displayName,
        gradeLevel: rest.gradeLevel,
        graduationYear: rest.graduationYear,
        cityCode: rest.cityCode,
        provinceCode: rest.provinceCode,
        relocationMode: rest.relocationMode,
        preferredRegions: rest.preferredRegionsJson,
        preferredMajors: rest.preferredMajorsJson,
        monthlyBudgetMin: rest.monthlyBudgetMin,
        monthlyBudgetMax: rest.monthlyBudgetMax,
        upfrontBudgetMax: rest.upfrontBudgetMax,
        housingMode: rest.housingMode,
        pinnedPrograms: rest.pinnedProgramsJson,
      },
      consents: consents.map((consent) => ({
        purposeVersion: consent.purposeVersion,
        isAccepted: consent.isAccepted,
        consentedAt: consent.consentedAt.toISOString(),
      })),
      academicRecords: rest.academicRecords.map((record) => ({ ...record })),
      interestSubmissions: rest.interestSubmissions.map((submission) => ({
        id: submission.id,
        instrumentVersion: submission.instrumentVersion,
        answers: row(submission.answersJson),
        submittedAt: submission.submittedAt.toISOString(),
      })),
      recommendationRuns: rest.recommendationRuns.map((run) => ({
        id: run.id,
        profileVersion: run.profileVersion,
        ruleVersion: run.ruleVersion,
        catalogVersion: run.catalogVersion,
        inputsSnapshot: row(run.inputsSnapshotJson),
        results: row(run.resultsJson),
        createdAt: run.createdAt.toISOString(),
      })),
      attempts: rest.attempts.map((attempt) => ({
        id: attempt.id,
        missionId: attempt.missionId,
        missionVersion: attempt.missionVersion,
        seed: attempt.seed,
        status: attempt.status,
        draftArtifact: row(attempt.artifactJson),
        result: row(attempt.resultJson),
        revision: attempt.revision,
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
      })),
      reflections: rest.reflections.map((reflection) => ({
        id: reflection.id,
        attemptId: reflection.attemptId,
        revision: reflection.revision,
        responses: row(reflection.responsesJson),
        isActive: reflection.isActive,
        createdAt: reflection.createdAt.toISOString(),
      })),
      plans: rest.plans.map((plan) => ({
        id: plan.id,
        goalIds: row(plan.goalIdsJson),
        weeklyMinutes: plan.weeklyMinutes,
        startDate: plan.startDate.toISOString().slice(0, 10),
        version: plan.version,
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          actionType: task.actionType,
          status: task.status,
          dueDate: task.dueDate.toISOString().slice(0, 10),
          evidenceNote: task.evidenceNote,
          evidenceUrl: task.evidenceUrl,
        })),
      })),
      passports: rest.passports.map((passport) => ({
        id: passport.id,
        snapshot: row(passport.snapshotJson),
        redactions: passport.redactionsJson,
        createdAt: passport.createdAt.toISOString(),
      })),
    };
  }
}
