import { describe, expect, it, jest } from '@jest/globals';
import { PassportService } from './passport.service.js';
import {
  redactSnapshot,
  type IPassportRepository,
  type PassportRecord,
  type PassportSource,
} from './interfaces/passport.repository.interface.js';
import { PASSPORT_SECTIONS } from './passport.dto.js';

const OWNER = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER = 'bbbbbbbb-0000-4000-8000-0000000000b2';

const SOURCE: PassportSource = {
  profile: { displayName: 'Siti', gradeLevel: 'XII' },
  academicRecords: [{ subject: 'Matematika', score: 88 }],
  budget: { monthlyBudgetMax: 3_000_000, upfrontBudgetMax: 5_000_000 },
  interests: { id: 'sub_1' },
  recommendations: { id: 'run_1' },
  reflections: [{ id: 'rfl_1', responses: { notes: 'private' } }],
  simulations: [],
  plans: null,
};

type Resolve<T> = () => Promise<T>;

function build() {
  const loadSources = jest.fn<Resolve<PassportSource | null>>(() =>
    Promise.resolve(SOURCE),
  );
  const insert = jest.fn<
    (input: {
      ownerId: string;
      snapshot: Record<string, unknown>;
      redactions: string[];
    }) => Promise<PassportRecord>
  >((input) =>
    Promise.resolve({
      id: 'psp_1',
      ownerId: input.ownerId,
      snapshot: input.snapshot,
      redactions: input.redactions as PassportRecord['redactions'],
      createdAt: '2026-10-16T08:00:00.000Z',
    }),
  );
  const findOwned = jest.fn<Resolve<PassportRecord | null>>(() =>
    Promise.resolve(null),
  );

  const repository = {
    loadSources,
    insert,
    findOwned,
  } as unknown as IPassportRepository;

  return {
    service: new PassportService(repository),
    loadSources,
    insert,
    findOwned,
  };
}

describe('redactSnapshot', () => {
  it('removes grades, budget, and reflections by default (AC-09B, T14)', () => {
    const { snapshot } = redactSnapshot(SOURCE, []);

    expect('academicRecords' in snapshot).toBe(false);
    expect('budget' in snapshot).toBe(false);
    expect('reflections' in snapshot).toBe(false);
  });

  it('keeps the sections the student did not hide', () => {
    const { snapshot } = redactSnapshot(SOURCE, []);

    expect('profile' in snapshot).toBe(true);
    expect('interests' in snapshot).toBe(true);
    expect('recommendations' in snapshot).toBe(true);
  });

  it('includes a section only when it is explicitly requested', () => {
    const { snapshot, redactions } = redactSnapshot(SOURCE, [
      'academicRecords',
      'budget',
    ]);

    expect('academicRecords' in snapshot).toBe(true);
    expect('budget' in snapshot).toBe(true);
    expect('reflections' in snapshot).toBe(false);
    expect(redactions).toEqual(['reflections']);
  });

  it('never leaks the redacted value anywhere in the payload (T14)', () => {
    const { snapshot } = redactSnapshot(SOURCE, []);

    const serialised = JSON.stringify(snapshot);

    expect(serialised).not.toContain('Matematika');
    expect(serialised).not.toContain('3000000');
    expect(serialised).not.toContain('private');
  });

  it('covers every declared section', () => {
    const { snapshot } = redactSnapshot(SOURCE, [...PASSPORT_SECTIONS]);

    expect(Object.keys(snapshot).sort()).toEqual([...PASSPORT_SECTIONS].sort());
  });
});

describe('PassportService', () => {
  it('stores the redacted snapshot, not the raw source', async () => {
    const { service, insert } = build();

    const record = await service.create(OWNER, { includeFields: [] });

    const stored = insert.mock.calls[0]?.[0];

    expect(stored?.ownerId).toBe(OWNER);
    expect(JSON.stringify(stored?.snapshot)).not.toContain('Matematika');
    expect(record.redactions).toEqual([
      'academicRecords',
      'budget',
      'reflections',
    ]);
  });

  it('includes explicitly requested sections', async () => {
    const { service } = build();

    const record = await service.create(OWNER, {
      includeFields: ['budget'],
    });

    expect(record.snapshot['budget']).toEqual(SOURCE.budget);
    expect('academicRecords' in record.snapshot).toBe(false);
  });

  it('reports not found when the account has no profile', async () => {
    const { service, loadSources } = build();
    loadSources.mockResolvedValue(null);

    await expect(
      service.create(OWNER, { includeFields: [] }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('never exposes another account passport (T01)', async () => {
    const { service, findOwned } = build();
    findOwned.mockResolvedValue(null);

    await expect(service.get(OTHER, 'psp_1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('reads an owned passport back unchanged', async () => {
    const { service, findOwned } = build();
    findOwned.mockResolvedValue({
      id: 'psp_1',
      ownerId: OWNER,
      snapshot: { profile: {} },
      redactions: ['budget'],
      createdAt: '2026-10-16T08:00:00.000Z',
    });

    const record = await service.get(OWNER, 'psp_1');

    expect(record.id).toBe('psp_1');
    expect(record.redactions).toEqual(['budget']);
  });
});
