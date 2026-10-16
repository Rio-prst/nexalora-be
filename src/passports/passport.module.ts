import { Module } from '@nestjs/common';
import { PassportController } from './passport.controller.js';
import { PassportRepository } from './passport.repository.js';
import { PassportService } from './passport.service.js';
import { IPassportRepository } from './interfaces/passport.repository.interface.js';
import { IPassportService } from './interfaces/passport.service.interface.js';

@Module({
  controllers: [PassportController],
  providers: [
    { provide: IPassportRepository, useClass: PassportRepository },
    { provide: IPassportService, useClass: PassportService },
  ],
  exports: [IPassportService],
})
export class PassportsModule {}
