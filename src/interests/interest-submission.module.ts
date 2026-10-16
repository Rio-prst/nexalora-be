import { Module } from '@nestjs/common';
import { IInterestSubmissionRepository } from './interfaces/interest-submission.repository.interface.js';
import { IInterestSubmissionService } from './interfaces/interest-submission.service.interface.js';
import { InterestSubmissionController } from './interest-submission.controller.js';
import { InterestSubmissionRepository } from './interest-submission.repository.js';
import { InterestSubmissionService } from './interest-submission.service.js';

@Module({
  controllers: [InterestSubmissionController],
  providers: [
    {
      provide: IInterestSubmissionRepository,
      useClass: InterestSubmissionRepository,
    },
    {
      provide: IInterestSubmissionService,
      useClass: InterestSubmissionService,
    },
  ],
  exports: [IInterestSubmissionService],
})
export class InterestsModule {}
