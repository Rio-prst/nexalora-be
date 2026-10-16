import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '../common/errors/app-error.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { Role } from '../common/types/role.js';
import type {
  ReviewSubmissionDto,
  SubmitProjectDto,
} from './simulation.dto.js';
import { ISimulationSubmissionRepository } from './interfaces/simulation-submission.repository.interface.js';
import type {
  PassportRecord,
  SubmissionRecord,
} from './interfaces/simulation-submission.repository.interface.js';

@Injectable()
export class SimulationSubmissionService {
  constructor(
    @Inject(ISimulationSubmissionRepository)
    private readonly repository: ISimulationSubmissionRepository,
  ) {}

  async submit(
    userId: string,
    input: SubmitProjectDto,
  ): Promise<SubmissionRecord> {
    const mission = await this.repository.findMission(input.missionId);

    if (!mission) {
      throw notFound('Mission not found');
    }

    return this.repository.insert({
      userId,
      missionId: mission.id,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSizeBytes: input.fileSizeBytes,
      studentNotes: input.studentNotes,
      checklistConfirmed: input.checklistConfirmed,
    });
  }

  async review(
    id: string,
    input: ReviewSubmissionDto,
  ): Promise<SubmissionRecord> {
    const updated = await this.repository.review(id, {
      status: input.status,
      ratingStars: input.ratingStars,
      reviewNotes: input.reviewNotes,
      reviewedAt: new Date(),
    });

    if (!updated) {
      throw notFound('Submission not found');
    }

    return updated;
  }

  async mySubmissions(userId: string): Promise<SubmissionRecord[]> {
    return this.repository.listByUser(userId);
  }

  async getById(
    user: AuthenticatedUser,
    id: string,
  ): Promise<SubmissionRecord> {
    const row = await this.repository.findById(id);

    if (!row || (row.userId !== user.userId && user.role !== Role.CURATOR)) {
      throw notFound('Submission not found');
    }

    return row;
  }

  async getDownloadUrl(
    user: AuthenticatedUser,
    id: string,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresInSeconds: number;
  }> {
    const row = await this.repository.findById(id);

    if (!row || (row.userId !== user.userId && user.role !== Role.CURATOR)) {
      throw notFound('Submission not found');
    }

    return {
      downloadUrl: row.fileUrl,
      fileName: row.fileName,
      expiresInSeconds: 3600,
    };
  }

  async passports(userId: string): Promise<PassportRecord[]> {
    return this.repository.listPassports(userId);
  }
}
