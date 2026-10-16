import { Injectable } from '@nestjs/common';
import { PublicationStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type {
  IMissionRepository,
  MissionDetail,
  MissionSummary,
} from './interfaces/mission.repository.interface.js';

const SUMMARY_SELECT = {
  id: true,
  title: true,
  majorId: true,
  description: true,
  estimatedMinutes: true,
  missionVersion: true,
  engineVersion: true,
} as const;

@Injectable()
export class MissionRepository implements IMissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<MissionSummary[]> {
    const rows = await this.prisma.mission.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      select: SUMMARY_SELECT,
      orderBy: [{ majorId: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      cluster: row.majorId,
      majorId: row.majorId,
      description: row.description,
      estimatedMinutes: row.estimatedMinutes,
      missionVersion: row.missionVersion,
      engineVersion: row.engineVersion,
    }));
  }

  async findPublished(id: string): Promise<MissionDetail | null> {
    const row = await this.prisma.mission.findFirst({
      where: {
        id,
        publicationStatus: PublicationStatus.PUBLISHED,
        major: { publicationStatus: PublicationStatus.PUBLISHED },
      },
      select: {
        ...SUMMARY_SELECT,
        contentJson: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      cluster: row.majorId,
      majorId: row.majorId,
      description: row.description,
      estimatedMinutes: row.estimatedMinutes,
      missionVersion: row.missionVersion,
      engineVersion: row.engineVersion,
      stages:
        row.contentJson === null || typeof row.contentJson !== 'object'
          ? []
          : row.contentJson,
    };
  }
}
