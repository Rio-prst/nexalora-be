import { describe, expect, it, jest } from '@jest/globals';
import { CatalogService, isCurriculumStale } from './catalog.service.js';
import { AppError } from '../common/errors/app-error.js';
import type {
  ICatalogRepository,
  StoredProgramDetail,
} from './interfaces/catalog.repository.interface.js';

type ListPrograms = () => Promise<
  Awaited<ReturnType<ICatalogRepository['listPublishedPrograms']>>
>;
type ListMajors = () => Promise<
  Awaited<ReturnType<ICatalogRepository['listPublishedMajors']>>
>;
type FindProgram = (id: string) => Promise<StoredProgramDetail | null>;

const EVIDENCE = {
  sourceId: '0f000000-0000-4000-8000-000000000002',
  publisher: 'Universitas Gadjah Mada',
  title: 'Panduan Program Studi 2026',
  applicableYear: 2026,
  checkedAt: '2026-09-01T00:00:00.000Z',
  url: 'https://example.test/ugm',
  reviewStatus: 'PENDING',
};

function detail(
  overrides: Partial<StoredProgramDetail> = {},
): StoredProgramDetail {
  return {
    id: 'ugm-inf-s1',
    name: 'Ilmu Komputer',
    degree: 'S1',
    campusLocation: 'Yogyakarta',
    admissionPaths: ['SNBT'],
    major: { id: 'inf', name: 'Informatika' },
    university: {
      id: 'ugm',
      name: 'UGM',
      cityCode: 'YK',
      provinceCode: 'DI',
    },
    evidence: EVIDENCE,
    costProfiles: [],
    curricula: [],
    ...overrides,
  };
}

function build() {
  const listPublishedPrograms = jest.fn<ListPrograms>(() =>
    Promise.resolve([]),
  );
  const listPublishedMajors = jest.fn<ListMajors>(() =>
    Promise.resolve([
      {
        id: 'inf',
        name: 'Informatika',
        summary: '...',
        prepSubjects: ['Math'],
      },
    ]),
  );
  const findPublishedProgram = jest.fn<FindProgram>(() =>
    Promise.resolve(detail()),
  );

  const repository = {
    listPublishedPrograms,
    listPublishedMajors,
    findPublishedProgram,
  } as unknown as ICatalogRepository;

  return {
    service: new CatalogService(repository),
    listPublishedPrograms,
    listPublishedMajors,
    findPublishedProgram,
  };
}

describe('CatalogService', () => {
  describe('list', () => {
    it('returns majors and programs from the repository unchanged', async () => {
      const { service } = build();

      const result = await service.list();

      expect(result.majors).toHaveLength(1);
      expect(result.majors[0]?.id).toBe('inf');
      expect(result.programs).toEqual([]);
    });

    it('returns empty collections rather than throwing when nothing is published', async () => {
      const { service, listPublishedMajors } = build();
      listPublishedMajors.mockResolvedValue([]);

      const result = await service.list();

      expect(result.majors).toEqual([]);
      expect(result.programs).toEqual([]);
    });
  });

  describe('getProgram', () => {
    it('marks a curriculum from the previous year or earlier as STALE', async () => {
      const { service, findPublishedProgram } = build();
      findPublishedProgram.mockResolvedValue(
        detail({
          curricula: [
            {
              curriculumYear: 2024,
              version: 'seed-v1',
              rules: [],
              evidence: EVIDENCE,
            },
          ],
        }),
      );

      const result = await service.getProgram('ugm-inf-s1');

      expect(result.curricula[0]?.freshness).toBe('STALE');
    });

    it('marks the current academic year as CURRENT', async () => {
      const { service, findPublishedProgram } = build();
      findPublishedProgram.mockResolvedValue(
        detail({
          curricula: [
            {
              curriculumYear: new Date().getUTCFullYear(),
              version: 'seed-v1',
              rules: [],
              evidence: EVIDENCE,
            },
          ],
        }),
      );

      const result = await service.getProgram('ugm-inf-s1');

      expect(result.curricula[0]?.freshness).toBe('CURRENT');
    });

    it('preserves null cost ranges instead of coercing them to zero (AC-03B)', async () => {
      const { service, findPublishedProgram } = build();
      findPublishedProgram.mockResolvedValue(
        detail({
          costProfiles: [
            {
              academicYear: 2026,
              admissionTrack: 'SNBT',
              housingMode: 'COS',
              version: 'seed-v1',
              components: {
                tuitionPerSemester: { min: null, max: null },
                livingCostMonthly: { min: 1_500_000, max: 2_000_000 },
                recurringSupportMonthly: null,
                upfrontCost: { min: null, max: 0 },
              },
              evidence: EVIDENCE,
            },
          ],
        }),
      );

      const result = await service.getProgram('ugm-inf-s1');
      const components = result.costProfiles[0]?.components;

      expect(components?.tuitionPerSemester).toEqual({ min: null, max: null });
      expect(components?.recurringSupportMonthly).toBeNull();
      expect(components?.upfrontCost).toEqual({ min: null, max: 0 });
    });

    it('throws a 404 AppError when the program is missing or unpublished', async () => {
      const { service, findPublishedProgram } = build();
      findPublishedProgram.mockResolvedValue(null);

      await expect(service.getProgram('missing')).rejects.toThrow(AppError);
    });
  });
});

describe('isCurriculumStale', () => {
  const NOW = new Date('2026-10-16T00:00:00.000Z');

  it.each([
    [2026, false],
    [2025, false],
    [2024, true],
    [2020, true],
  ])('curriculumYear %i -> %s', (year, expected) => {
    expect(isCurriculumStale(year, NOW)).toBe(expected);
  });

  it('rolls forward with the calendar rather than hard-coding a year', () => {
    expect(isCurriculumStale(2025, new Date('2027-10-16T00:00:00.000Z'))).toBe(
      true,
    );
  });
});
