import { Module } from '@nestjs/common';
import { CareerController } from './career.controller.js';
import { CareerRepository } from './career.repository.js';
import { ICareerRepository } from './interfaces/career.repository.interface.js';

@Module({
  controllers: [CareerController],
  providers: [{ provide: ICareerRepository, useClass: CareerRepository }],
  exports: [ICareerRepository],
})
export class CareersModule {}
