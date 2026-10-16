import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { CatalogController } from './catalog.controller.js';
import type { ICatalogService } from './interfaces/catalog.service.interface.js';

type List = () => Promise<{
  majors: unknown[];
  programs: unknown[];
}>;
type GetProgram = (id: string) => Promise<Record<string, unknown>>;

const LIST_RESULT = {
  majors: [{ id: 'inf', name: 'Informatika', summary: '', prepSubjects: [] }],
  programs: [],
};

function build() {
  const list = jest.fn<List>(() => Promise.resolve(LIST_RESULT));
  const getProgram = jest.fn<GetProgram>(() =>
    Promise.resolve({ id: 'ugm-inf-s1', name: 'Ilmu Komputer' }),
  );

  const service = { list, getProgram } as unknown as ICatalogService;

  return {
    controller: new CatalogController(service),
    list,
    getProgram,
  };
}

function responseStub(): Response {
  return {
    getHeader: (name: string) => (name === 'x-request-id' ? 'req_ctrl' : ''),
  } as unknown as Response;
}

describe('CatalogController', () => {
  it('wraps the catalogue list in the data/meta envelope', async () => {
    const { controller } = build();

    const result = await controller.list(responseStub());

    expect(result).toEqual({
      data: LIST_RESULT,
      meta: { requestId: 'req_ctrl' },
    });
  });

  it('passes the path parameter through to the service', async () => {
    const { controller, getProgram } = build();

    const result = await controller.getProgram(
      'ugm-inf-s1',
      responseStub(),
    );

    expect(getProgram).toHaveBeenCalledWith('ugm-inf-s1');
    expect(result.data).toEqual({
      id: 'ugm-inf-s1',
      name: 'Ilmu Komputer',
    });
  });

  it('propagates the service 404 instead of masking it', async () => {
    const { controller, getProgram } = build();
    getProgram.mockRejectedValue(new Error('not found'));

    await expect(
      controller.getProgram('missing', responseStub()),
    ).rejects.toThrow('not found');
  });
});
