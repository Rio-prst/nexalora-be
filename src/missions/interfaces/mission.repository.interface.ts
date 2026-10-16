export type MissionSummary = {
  id: string;
  title: string;
  cluster: string;
  majorId: string;
  description: string | null;
  estimatedMinutes: number | null;
  missionVersion: string;
  engineVersion: string;
};

export type MissionDetail = MissionSummary & {
  stages: unknown;
};

export interface IMissionRepository {
  listPublished(): Promise<MissionSummary[]>;
  findPublished(id: string): Promise<MissionDetail | null>;
}

export const IMissionRepository = Symbol('IMissionRepository');
