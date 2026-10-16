import { Module } from '@nestjs/common';
import { AttemptController } from './attempt.controller.js';
import { AttemptRepository } from './attempt.repository.js';
import { AttemptService } from './attempt.service.js';
import { IAttemptRepository } from './interfaces/attempt.repository.interface.js';
import { IAttemptService } from './interfaces/attempt.service.interface.js';

@Module({
  controllers: [AttemptController],
  providers: [
    { provide: IAttemptRepository, useClass: AttemptRepository },
    { provide: IAttemptService, useClass: AttemptService },
  ],
  exports: [IAttemptService],
})
export class SimulationsModule {}
