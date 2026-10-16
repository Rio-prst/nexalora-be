import type { CreatePassportDto } from '../passport.dto.js';
import type { PassportRecord } from './passport.repository.interface.js';

export interface IPassportService {
  create(ownerId: string, input: CreatePassportDto): Promise<PassportRecord>;
  get(ownerId: string, id: string): Promise<PassportRecord>;
}

export const IPassportService = Symbol('IPassportService');
