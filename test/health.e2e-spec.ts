import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';

interface HealthBody {
  data: { status: string; uptimeSeconds: number };
  meta: { requestId: string };
}

describe('Health endpoints (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(
      moduleFixture.createNestApplication<INestApplication<Server>>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('returns the success envelope with a generated request id', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');
      const body = response.body as HealthBody;

      expect(response.status).toBe(200);
      expect(body.data.status).toBe('ok');
      expect(body.meta.requestId).toMatch(/^req_/);
      expect(response.headers['x-request-id']).toBe(body.meta.requestId);
    });

    it('preserves a client-supplied request id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Request-Id', 'req_e2e_fixed');
      const body = response.body as HealthBody;

      expect(response.headers['x-request-id']).toBe('req_e2e_fixed');
      expect(body.meta.requestId).toBe('req_e2e_fixed');
    });

    it('needs no authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');

      expect(response.status).not.toBe(401);
    });
  });

  describe('global prefix', () => {
    it('does not serve the routes without the /api prefix', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(404);
    });
  });
});
