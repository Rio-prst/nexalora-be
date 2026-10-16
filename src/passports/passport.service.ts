import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '../common/errors/app-error.js';
import type { CreatePassportDto } from './passport.dto.js';
import { IPassportRepository } from './interfaces/passport.repository.interface.js';
import {
  redactSnapshot,
  type PassportRecord,
} from './interfaces/passport.repository.interface.js';
import type { IPassportService } from './interfaces/passport.service.interface.js';

@Injectable()
export class PassportService implements IPassportService {
  constructor(
    @Inject(IPassportRepository)
    private readonly repository: IPassportRepository,
  ) {}

  async create(
    ownerId: string,
    input: CreatePassportDto,
  ): Promise<PassportRecord> {
    const source = await this.repository.loadSources(ownerId);

    if (!source) {
      throw notFound('Profile not found');
    }

    const { snapshot, redactions } = redactSnapshot(
      source,
      input.includeFields,
    );

    return this.repository.insert({ ownerId, snapshot, redactions });
  }

  async get(ownerId: string, id: string): Promise<PassportRecord> {
    const record = await this.repository.findOwned(ownerId, id);

    if (!record) {
      throw notFound('Passport not found');
    }

    return record;
  }
}
