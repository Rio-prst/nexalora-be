import { describe, expect, it } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import type { Response } from 'express';

function createResponse(): Response {
  return {
    getHeader(name: string): string {
      return name === 'x-request-id' ? 'req_health_test' : '';
    },
  } as unknown as Response;
}

async function createController(
  queryRaw: () => Promise<unknown>,
): Promise<HealthController> {
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;

  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: prisma }],
  }).compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('reports liveness without touching the database', async () => {
    let queried = false;
    const controller = await createController(() => {
      queried = true;
      return Promise.resolve([]);
    });

    const result = controller.getLiveness(createResponse());

    expect(result.data.status).toBe('ok');
    expect(result.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.meta.requestId).toBe('req_health_test');
    expect(queried).toBe(false);
  });

  it('reports a reachable database', async () => {
    const controller = await createController(() =>
      Promise.resolve([{ '?column?': 1 }]),
    );

    const result = await controller.getReadiness(createResponse());

    expect(result.data).toEqual({ status: 'ok', database: 'reachable' });
    expect(result.meta.requestId).toBe('req_health_test');
  });

  it('reports an unreachable database instead of throwing', async () => {
    const controller = await createController(() =>
      Promise.reject(new Error('connection terminated')),
    );

    const result = await controller.getReadiness(createResponse());

    expect(result.data.status).toBe('degraded');
    expect(result.data.database).toBe('unreachable');
    expect(result.data.error).toBe('connection terminated');
  });
});
