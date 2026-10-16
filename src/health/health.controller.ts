import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';

interface LivenessBody {
  status: 'ok';
  uptimeSeconds: number;
}

interface ReadinessBody {
  status: 'ok' | 'degraded';
  database: 'reachable' | 'unreachable';
  error?: string;
}

/**
 * Liveness and readiness probes.
 *
 * `GET /health` issues no query. Note that the process still opens a database
 * connection during bootstrap (see PrismaService), so a database outage takes
 * the whole application down rather than only degrading this endpoint; what
 * this endpoint confirms is that the HTTP server is answering.
 *
 * `GET /health/ready` issues `SELECT 1` to prove the connection is usable right
 * now, and reports failure in the payload rather than throwing, so an
 * orchestrator can distinguish a degraded app from a crashed one.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe. Performs no database query.' })
  @ApiOkResponse({ description: 'The HTTP server is responding.' })
  getLiveness(
    @Res({ passthrough: true }) response: Response,
  ): ApiEnvelope<LivenessBody> {
    return {
      data: {
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
      },
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe. Verifies the database connection.',
  })
  @ApiOkResponse({ description: 'The database connection is usable.' })
  async getReadiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ReadinessBody>> {
    const requestId = readRequestId(response);

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        data: { status: 'ok', database: 'reachable' },
        meta: { requestId },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      return {
        data: { status: 'degraded', database: 'unreachable', error: message },
        meta: { requestId },
      };
    }
  }
}
