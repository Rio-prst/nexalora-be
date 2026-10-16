import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type { ReviewStatus } from './simulation.routes.js';
import type {
  ISimulationSubmissionRepository,
  NewSubmission,
  PassportRecord,
  ReviewPatch,
  SubmissionRecord,
} from './interfaces/simulation-submission.repository.interface.js';

type Row = {
  id: string;
  missionId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  studentNotes: string | null;
  checklistConfirmed: boolean;
  reviewStatus: string | null;
  ratingStars: number | null;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

const SELECT = {
  id: true,
  missionId: true,
  fileName: true,
  fileUrl: true,
  fileSizeBytes: true,
  studentNotes: true,
  checklistConfirmed: true,
  reviewStatus: true,
  ratingStars: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true,
} as const;

function toRecord(row: Row): SubmissionRecord {
  return {
    id: row.id,
    missionId: row.missionId,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    fileSizeBytes: row.fileSizeBytes,
    studentNotes: row.studentNotes,
    checklistConfirmed: row.checklistConfirmed,
    reviewStatus: (row.reviewStatus as ReviewStatus | null) ?? null,
    ratingStars: row.ratingStars,
    reviewNotes: row.reviewNotes,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class SimulationSubmissionRepository implements ISimulationSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMission(missionId: string): Promise<{ id: string } | null> {
    const row = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true },
    });

    return row;
  }

  async insert(submission: NewSubmission): Promise<SubmissionRecord> {
    const row = await this.prisma.simulationSubmission.create({
      data: submission,
      select: SELECT,
    });

    return toRecord(row);
  }

  async review(
    id: string,
    patch: ReviewPatch,
  ): Promise<SubmissionRecord | null> {
    const target = await this.prisma.simulationSubmission.findUnique({
      where: { id },
      select: { id: true, userId: true, missionId: true },
    });

    if (!target) return null;

    const row = await this.prisma.simulationSubmission.update({
      where: { id },
      data: {
        reviewStatus: patch.status,
        ratingStars: patch.ratingStars,
        reviewNotes: patch.reviewNotes,
        reviewedAt: patch.reviewedAt,
      },
      select: SELECT,
    });

    if (patch.status === 'lulus') {
      const existing = await this.prisma.miniCoursePassport.findFirst({
        where: { userId: target.userId, missionId: target.missionId },
        select: { id: true },
      });

      if (!existing) {
        const certNum = `NEXA-${target.missionId
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
        await this.prisma.miniCoursePassport.create({
          data: {
            userId: target.userId,
            missionId: target.missionId,
            certificateNumber: certNum,
            completedAt: patch.reviewedAt,
          },
        });
      }
    }

    return toRecord(row);
  }

  async listByUser(userId: string): Promise<SubmissionRecord[]> {
    const rows = await this.prisma.simulationSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });

    return rows.map(toRecord);
  }

  async findById(
    id: string,
  ): Promise<(SubmissionRecord & { userId: string }) | null> {
    const row = await this.prisma.simulationSubmission.findUnique({
      where: { id },
      select: { ...SELECT, userId: true },
    });

    if (!row) return null;

    return {
      ...toRecord(row),
      userId: row.userId,
    };
  }

  async listPassports(userId: string): Promise<PassportRecord[]> {
    const rows = await this.prisma.miniCoursePassport.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        missionId: true,
        certificateNumber: true,
        completedAt: true,
        mission: { select: { title: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      missionId: row.missionId,
      missionTitle: row.mission.title,
      certificateNumber: row.certificateNumber,
      completedAt: row.completedAt.toISOString(),
    }));
  }
}
