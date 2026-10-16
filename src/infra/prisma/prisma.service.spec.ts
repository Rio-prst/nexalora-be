import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/test_db';

describe('PrismaService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails fast when DATABASE_URL is missing', () => {
    const config = {
      getOrThrow: jest.fn(() => {
        throw new Error('Configuration key "DATABASE_URL" does not exist');
      }),
    } as unknown as ConfigService;

    expect(() => new PrismaService(config)).toThrow(/DATABASE_URL/);
  });

  it('connects on module init and disconnects on destroy', async () => {
    const service = new PrismaService({
      getOrThrow: () => DATABASE_URL,
    } as unknown as ConfigService);

    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();

    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('reads DATABASE_URL through ConfigService.getOrThrow', () => {
    const requested: string[] = [];
    const getOrThrow = (key: string): string => {
      requested.push(key);
      return DATABASE_URL;
    };

    // Instantiating the adapter opens no connection, so this stays a pure unit
    // test. `instanceof` is deliberately not asserted: Prisma 7's generated
    // client is a proxy, so the constructed value fails `instanceof PrismaService`.
    new PrismaService({ getOrThrow } as unknown as ConfigService);

    expect(requested).toEqual(['DATABASE_URL']);
  });
});
