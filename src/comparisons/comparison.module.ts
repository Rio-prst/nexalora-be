import { Module } from '@nestjs/common';
import { ComparisonController } from './comparison.controller.js';
import { ComparisonRepository } from './comparison.repository.js';
import { ComparisonService } from './comparison.service.js';
import { IComparisonRepository } from './interfaces/comparison.repository.interface.js';
import { IComparisonService } from './interfaces/comparison.service.interface.js';

@Module({
  controllers: [ComparisonController],
  providers: [
    { provide: IComparisonRepository, useClass: ComparisonRepository },
    { provide: IComparisonService, useClass: ComparisonService },
  ],
  exports: [IComparisonService],
})
export class ComparisonsModule {}
