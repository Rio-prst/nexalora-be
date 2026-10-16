import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { CareerController } from './career.controller.js';
import type {
  CareerDetail,
  CareerSummary,
  ICareerRepository,
} from './interfaces/career.repository.interface.js';

const SUMMARY: CareerSummary = {
  id: 'software-engineer',
  title: 'Software Engineer',
  summary: 'Membangun dan memelihara perangkat lunak.',
  activities: ['Merancang fitur'],
  industry: null,
  outlook: null,
  salaryRange: { min: null, max: null, currency: 'IDR', verified: false },
  relatedMajors: [{ id: 'INF', name: 'Informatika' }],
};

const DETAIL: CareerDetail = {
  ...SUMMARY,
  challenges: [],
  skills: [
    { id: 'programming', name: 'Pemrograman', description: 'Menulis kode.' },
  ],
};

type ListFn = () => Promise<CareerSummary[]>;
type FindFn = (id: string) => Promise<CareerDetail | null>;

function build() {
  const listPublished = jest.fn<ListFn>(() => Promise.resolve([SUMMARY]));
  const findPublished = jest.fn<FindFn>(() => Promise.resolve(DETAIL));

  const repository = {
    listPublished,
    findPublished,
  } as unknown as ICareerRepository;

  return {
    controller: new CareerController(repository),
    listPublished,
    findPublished,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

describe('CareerController', () => {
  it('returns only majors that actually exist in the catalogue', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data[0]?.relatedMajors).toEqual([
      { id: 'INF', name: 'Informatika' },
    ]);
  });

  it('marks an unrecorded salary range as unverified rather than zero (R10)', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data[0]?.salaryRange).toEqual({
      min: null,
      max: null,
      currency: 'IDR',
      verified: false,
    });
  });

  it('includes skills and challenges on the detail route', async () => {
    const { controller } = build();

    const result = await controller.detail('software-engineer', responseStub());

    expect(result.data.skills).toHaveLength(1);
    expect(result.data.challenges).toEqual([]);
  });

  it('reports not found for an unpublished career', async () => {
    const { controller, findPublished } = build();
    findPublished.mockResolvedValue(null);

    await expect(
      controller.detail('missing', responseStub()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
