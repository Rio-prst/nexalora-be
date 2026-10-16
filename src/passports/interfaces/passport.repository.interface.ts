import {
  PASSPORT_SECTIONS,
  REDACTED_BY_DEFAULT,
  type PassportSection,
} from '../passport.dto.js';

export type PassportSnapshotPayload = Record<string, unknown>;

export type PassportRecord = {
  id: string;
  ownerId: string;
  snapshot: PassportSnapshotPayload;
  redactions: PassportSection[];
  createdAt: string;
};

export type PassportSource = {
  profile: Record<string, unknown>;
  academicRecords: unknown[];
  budget: Record<string, unknown>;
  interests: unknown;
  recommendations: unknown;
  reflections: unknown;
  simulations: unknown;
  plans: unknown;
};

export type NewPassport = {
  ownerId: string;
  snapshot: PassportSnapshotPayload;
  redactions: PassportSection[];
};

export interface IPassportRepository {
  loadSources(ownerId: string): Promise<PassportSource | null>;
  insert(passport: NewPassport): Promise<PassportRecord>;
  findOwned(ownerId: string, id: string): Promise<PassportRecord | null>;
}

export const IPassportRepository = Symbol('IPassportRepository');

export function redactSnapshot(
  source: PassportSource,
  includeFields: readonly PassportSection[],
): {
  snapshot: PassportSnapshotPayload;
  redactions: PassportSection[];
} {
  const included = new Set<PassportSection>(includeFields);
  const redactions = REDACTED_BY_DEFAULT.filter(
    (section) => !included.has(section),
  );
  const redacted = new Set<PassportSection>(redactions);

  const snapshot: PassportSnapshotPayload = {};

  for (const section of PASSPORT_SECTIONS) {
    if (redacted.has(section)) continue;

    snapshot[section] = source[section];
  }

  return { snapshot, redactions };
}
