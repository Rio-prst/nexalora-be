import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  AttemptSnapshot,
  AttemptStatus,
  IAttemptRepository,
  NewAttempt,
  StoredMission,
} from './interfaces/attempt.repository.interface.js';

function snapshot(row: {
  id: string;
  missionId: string;
  missionVersion: string;
  seed: string;
  status: string;
  artifactJson: unknown;
  resultJson: unknown;
  revision: number;
  lastRunRevision: number | null;
  createdAt: Date;
  updatedAt: Date;
}): AttemptSnapshot {
  return {
    id: row.id,
    missionId: row.missionId,
    missionVersion: row.missionVersion,
    seed: row.seed,
    status: row.status as AttemptStatus,
    draftArtifact: row.artifactJson,
    result: row.resultJson,
    revision: row.revision,
    lastRunRevision: row.lastRunRevision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const SELECT = {
  id: true,
  missionId: true,
  missionVersion: true,
  seed: true,
  status: true,
  artifactJson: true,
  resultJson: true,
  revision: true,
  lastRunRevision: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AttemptRepository implements IAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMission(missionId: string): Promise<StoredMission | null> {
    const row = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        missionVersion: true,
        engineVersion: true,
        majorId: true,
        configJson: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      missionVersion: row.missionVersion,
      engineVersion: row.engineVersion,
      majorId: row.majorId,
      config: row.configJson,
    };
  }

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<AttemptSnapshot | null> {
    const row = await this.prisma.attempt.findFirst({
      where: { userId, idempotencyKey },
      select: SELECT,
    });

    return row ? snapshot(row) : null;
  }

  async insert(attempt: NewAttempt): Promise<AttemptSnapshot> {
    const row = await this.prisma.attempt.create({
      data: {
        userId: attempt.userId,
        missionId: attempt.missionId,
        missionVersion: attempt.missionVersion,
        seed: attempt.seed,
        idempotencyKey: attempt.idempotencyKey,
        artifactJson: (attempt.draftArtifact ?? null) as never,
      },
      select: SELECT,
    });

    return snapshot(row);
  }

  async findOwned(userId: string, id: string): Promise<AttemptSnapshot | null> {
    const row = await this.prisma.attempt.findFirst({
      where: { id, userId },
      select: SELECT,
    });

    return row ? snapshot(row) : null;
  }

  async saveDraft(
    userId: string,
    id: string,
    expectedRevision: number,
    draftArtifact: unknown,
  ): Promise<AttemptSnapshot | null> {
    const result = await this.prisma.attempt.updateMany({
      where: { id, userId, revision: expectedRevision },
      data: {
        artifactJson: (draftArtifact ?? null) as never,
        revision: { increment: 1 },
      },
    });

    if (result.count === 0) return null;

    return this.findOwned(userId, id);
  }

  async saveResult(
    userId: string,
    id: string,
    expectedRevision: number,
    result: unknown,
  ): Promise<AttemptSnapshot | null> {
    const updated = await this.prisma.attempt.updateMany({
      where: { id, userId, revision: expectedRevision },
      data: {
        resultJson: result as never,
        status: 'RESULT_READY',
        lastRunRevision: expectedRevision + 1,
        revision: { increment: 1 },
      },
    });

    if (updated.count === 0) return null;

    return this.findOwned(userId, id);
  }
}
