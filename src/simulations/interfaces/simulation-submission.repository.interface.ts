import type { ReviewStatus } from '../simulation.routes.js';

export type SubmissionRecord = {
  id: string;
  missionId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  studentNotes: string | null;
  checklistConfirmed: boolean;
  reviewStatus: ReviewStatus | null;
  ratingStars: number | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type PassportRecord = {
  id: string;
  missionId: string;
  missionTitle: string;
  certificateNumber: string;
  completedAt: string;
};

export type NewSubmission = {
  userId: string;
  missionId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  studentNotes: string | null;
  checklistConfirmed: boolean;
};

export type ReviewPatch = {
  status: ReviewStatus;
  ratingStars: number | null;
  reviewNotes: string | null;
  reviewedAt: Date;
};

export type StoredSubmissionWithUser = SubmissionRecord & { userId: string };

export interface ISimulationSubmissionRepository {
  findMission(missionId: string): Promise<{ id: string } | null>;
  insert(submission: NewSubmission): Promise<SubmissionRecord>;
  review(id: string, patch: ReviewPatch): Promise<SubmissionRecord | null>;
  listPassports(userId: string): Promise<PassportRecord[]>;
  listByUser(userId: string): Promise<SubmissionRecord[]>;
  findById(id: string): Promise<StoredSubmissionWithUser | null>;
}

export const ISimulationSubmissionRepository = Symbol(
  'ISimulationSubmissionRepository',
);
