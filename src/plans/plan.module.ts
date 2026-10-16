import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller.js';
import { PlanRepository } from './plan.repository.js';
import { PlanService } from './plan.service.js';
import { IPlanRepository } from './interfaces/plan.repository.interface.js';
import { IPlanService } from './interfaces/plan.service.interface.js';

@Module({
  controllers: [PlanController],
  providers: [
    { provide: IPlanRepository, useClass: PlanRepository },
    { provide: IPlanService, useClass: PlanService },
  ],
  exports: [IPlanService],
})
export class PlansModule {}
