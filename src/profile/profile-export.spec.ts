import { describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';
import {
  IProfileExportRepository,
  EXPORT_SCHEMA_VERSION,
  type AccountDataExport,
} from './interfaces/profile-export.repository.interface.js';
import { ProfileController } from './profile.controller.js';
import type { IProfileService } from './interfaces/profile.service.interface.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER_ID = 'bbbbbbbb-0000-4000-8000-0000000000b2';

const EXPORT: AccountDataExport = {
  schemaVersion: EXPORT_SCHEMA_VERSION,
  exportedAt: '2026-10-16T08:00:00.000Z',
  owner: {
    userId: USER_ID,
    profileVersion: 3,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  profile: { displayName: 'Siti' },
  consents: [],
  academicRecords: [
    { subject: 'Matematika', semester: 1, score: 88, scale: '0-100' },
  ],
  interestSubmissions: [],
  recommendationRuns: [],
  attempts: [],
  reflections: [],
  plans: [],
  passports: [],
};

type LoadFn = (userId: string) => Promise<AccountDataExport | null>;

function build() {
  const loadAll = jest.fn<LoadFn>(() => Promise.resolve(EXPORT));
  const exportRepository = { loadAll } as unknown as IProfileExportRepository;
  const profileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccountData: jest.fn(),
  } as unknown as IProfileService;

  const headers = new Map<string, string>();
  const response = {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
    setHeader: (name: string, value: string) => headers.set(name, value),
  } as unknown as Response;

  return {
    controller: new ProfileController(profileService, exportRepository),
    loadAll,
    headers,
    response,
  };
}

describe('ProfileController export', () => {
  it('reads the export for the authenticated account only', async () => {
    const { controller, loadAll, response } = build();

    await controller.exportAccountData({ userId: USER_ID } as never, response);

    expect(loadAll).toHaveBeenCalledWith(USER_ID);
  });

  it('marks the response as a downloadable attachment', async () => {
    const { controller, headers, response } = build();

    await controller.exportAccountData({ userId: USER_ID } as never, response);

    expect(headers.get('Content-Disposition')).toContain('attachment');
  });

  it('never exposes another account archive (T01)', async () => {
    const { controller, loadAll, response } = build();
    loadAll.mockResolvedValue(null);

    await expect(
      controller.exportAccountData({ userId: OTHER_ID } as never, response),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('includes every category the export contract promises', async () => {
    const { controller, response } = build();

    const result = await controller.exportAccountData(
      { userId: USER_ID } as never,
      response,
    );

    expect(Object.keys(result.data)).toEqual(
      expect.arrayContaining([
        'profile',
        'consents',
        'academicRecords',
        'interestSubmissions',
        'recommendationRuns',
        'attempts',
        'reflections',
        'plans',
        'passports',
      ]),
    );
  });

  it('carries a schema version so an archive stays readable later', async () => {
    const { controller, response } = build();

    const result = await controller.exportAccountData(
      { userId: USER_ID } as never,
      response,
    );

    expect(result.data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
  });
});
