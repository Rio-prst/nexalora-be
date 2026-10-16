import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  IReflectionRepository,
  NewReflection,
  OwnedAttempt,
  ReflectionSnapshot,
} from './interfaces/reflection.repository.interface.js';

@Injectable()
export class ReflectionRepository implements IReflectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedAttempt(
    userId: string,
    attemptId: string,
  ): Promise<OwnedAttempt | null> {
    const row = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      select: {
        id: true,
        missionId: true,
        revision: true,
        mission: { select: { majorId: true } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      missionId: row.missionId,
      majorId: row.mission.majorId,
      revision: row.revision,
    };
  }

  async findLatestRevision(attemptId: string): Promise<number> {
    const rows = await this.prisma.reflection.findMany({
      where: { attemptId },
      select: { revision: true },
      orderBy: { revision: 'desc' },
      take: 1,
    });

    return rows[0]?.revision ?? 0;
  }

  async deactivateOthers(userId: string, attemptId: string): Promise<void> {
    await this.prisma.reflection.updateMany({
      where: { userId, attemptId, isActive: true },
      data: { isActive: false },
    });
  }

  async insert(reflection: NewReflection): Promise<ReflectionSnapshot> {
    const row = await this.prisma.reflection.create({
      data: {
        userId: reflection.userId,
        attemptId: reflection.attemptId,
        revision: reflection.revision,
        responsesJson: reflection.responses as never,
        isActive: reflection.isActive,
      },
      select: {
        id: true,
        attemptId: true,
        revision: true,
        isActive: true,
        responsesJson: true,
        createdAt: true,
      },
    });

    return {
      id: row.id,
      attemptId: row.attemptId,
      revision: row.revision,
      isActive: row.isActive,
      responses: row.responsesJson,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
