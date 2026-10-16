import { Module } from '@nestjs/common';
import { ISimulationSubmissionRepository } from './interfaces/simulation-submission.repository.interface.js';
import { SimulationSubmissionController } from './simulation-submission.controller.js';
import { SimulationSubmissionRepository } from './simulation-submission.repository.js';
import { SimulationSubmissionService } from './simulation-submission.service.js';

@Module({
  controllers: [SimulationSubmissionController],
  providers: [
    {
      provide: ISimulationSubmissionRepository,
      useClass: SimulationSubmissionRepository,
    },
    SimulationSubmissionService,
  ],
  exports: [ISimulationSubmissionRepository],
})
export class SimulationSubmissionsModule {}
