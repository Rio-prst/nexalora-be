export type ReflectionSnapshot = {
  id: string;
  attemptId: string;
  revision: number;
  isActive: boolean;
  responses: unknown;
  createdAt: string;
};

export type ReflectionPreview = {
  reflectionId: string;
  majorId: string;
  continueInterest: number | null;
  experienceStatus: 'TRIED';
  preview: {
    ruleVersion: string;
    reflectionApplied: true;
    pendingApplication: true;
    note: 'Preview only; nothing was recomputed or stored';
  };
};

export type OwnedAttempt = {
  id: string;
  missionId: string;
  majorId: string;
  revision: number;
};

export type NewReflection = {
  userId: string;
  attemptId: string;
  revision: number;
  responses: unknown;
  isActive: boolean;
};

export interface IReflectionRepository {
  findOwnedAttempt(
    userId: string,
    attemptId: string,
  ): Promise<OwnedAttempt | null>;
  findLatestRevision(attemptId: string): Promise<number>;
  deactivateOthers(userId: string, attemptId: string): Promise<void>;
  insert(reflection: NewReflection): Promise<ReflectionSnapshot>;
}

export const IReflectionRepository = Symbol('IReflectionRepository');
