import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { MissionController } from './mission.controller.js';
import type {
  IMissionRepository,
  MissionDetail,
  MissionSummary,
} from './interfaces/mission.repository.interface.js';

const SUMMARY: MissionSummary = {
  id: 'dkv-menu-yang-terbaca',
  title: 'Menu yang Terbaca',
  cluster: 'DKV',
  majorId: 'DKV',
  description: null,
  estimatedMinutes: 15,
  missionVersion: 'v1',
  engineVersion: 'DKV-v1',
};

const DETAIL: MissionDetail = { ...SUMMARY, stages: [] };

type ListFn = () => Promise<MissionSummary[]>;
type FindFn = (id: string) => Promise<MissionDetail | null>;

function build() {
  const listPublished = jest.fn<ListFn>(() => Promise.resolve([SUMMARY]));
  const findPublished = jest.fn<FindFn>(() => Promise.resolve(DETAIL));

  const repository = {
    listPublished,
    findPublished,
  } as unknown as IMissionRepository;

  return {
    controller: new MissionController(repository),
    listPublished,
    findPublished,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

describe('MissionController', () => {
  it('wraps the mission list in the data/meta envelope', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data).toHaveLength(1);
    expect(result.meta.requestId).toBe('req_ctrl');
  });

  it('exposes the major id as the cluster verbatim', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result.data[0]?.cluster).toBe('DKV');
  });

  it('returns empty stages when content has not been authored yet', async () => {
    const { controller } = build();

    const result = await controller.detail(
      'dkv-menu-yang-terbaca',
      responseStub(),
    );

    expect(result.data.stages).toEqual([]);
  });

  it('reports not found for an unpublished or unknown mission', async () => {
    const { controller, findPublished } = build();
    findPublished.mockResolvedValue(null);

    await expect(
      controller.detail('missing', responseStub()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
