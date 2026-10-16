import { Module } from '@nestjs/common';
import { IInterestQuestionRepository } from './interest-question.repository.js';
import { InterestQuestionController } from './interest-question.controller.js';
import { InterestQuestionRepository } from './interest-question.repository.js';
import { IInterestSubmissionRepository } from './interfaces/interest-submission.repository.interface.js';
import { IInterestSubmissionService } from './interfaces/interest-submission.service.interface.js';
import { InterestSubmissionController } from './interest-submission.controller.js';
import { InterestSubmissionRepository } from './interest-submission.repository.js';
import { InterestSubmissionService } from './interest-submission.service.js';

@Module({
  controllers: [InterestSubmissionController, InterestQuestionController],
  providers: [
    {
      provide: IInterestQuestionRepository,
      useClass: InterestQuestionRepository,
    },
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
