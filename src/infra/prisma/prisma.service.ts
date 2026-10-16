import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * The only place in the application that talks to PostgreSQL.
 *
 * Prisma 7 requires an explicit driver adapter; `datasourceUrl` and
 * `datasources.db.url` no longer exist. This mirrors the connection setup in
 * `prisma/seed.ts` so the runtime and the seed cannot drift apart.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        // Prisma 7 uses node-pg, which validates TLS certificates more strictly
        // than the Rust engine did in Prisma 6. Supabase chains certificates
        // node-pg does not always trust, which surfaces as `P1010`. Permissive
        // settings are fine for development; production must supply the real CA
        // through NODE_EXTRA_CA_CERTS instead of relying on this flag.
        ssl: { rejectUnauthorized: false },
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
