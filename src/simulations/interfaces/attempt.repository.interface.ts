export type AttemptStatus = 'DRAFT' | 'RUNNING' | 'RESULT_READY' | 'COMPLETED';

export type AttemptSnapshot = {
  id: string;
  missionId: string;
  missionVersion: string;
  seed: string;
  status: AttemptStatus;
  draftArtifact: unknown;
  result: unknown;
  revision: number;
  lastRunRevision: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredMission = {
  id: string;
  missionVersion: string;
  engineVersion: string;
  majorId: string;
  config: unknown;
};

export type NewAttempt = {
  userId: string;
  missionId: string;
  missionVersion: string;
  seed: string;
  idempotencyKey: string;
  draftArtifact: unknown;
};

export interface IAttemptRepository {
  findMission(missionId: string): Promise<StoredMission | null>;
  findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<AttemptSnapshot | null>;
  insert(attempt: NewAttempt): Promise<AttemptSnapshot>;
  findOwned(userId: string, id: string): Promise<AttemptSnapshot | null>;
  saveDraft(
    userId: string,
    id: string,
    expectedRevision: number,
    draftArtifact: unknown,
  ): Promise<AttemptSnapshot | null>;
  saveResult(
    userId: string,
    id: string,
    expectedRevision: number,
    result: unknown,
  ): Promise<AttemptSnapshot | null>;
}

export const IAttemptRepository = Symbol('IAttemptRepository');
