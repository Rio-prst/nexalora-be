import { Module } from '@nestjs/common';
import { IReflectionRepository } from './interfaces/reflection.repository.interface.js';
import { IReflectionService } from './interfaces/reflection.service.interface.js';
import { ReflectionController } from './reflection.controller.js';
import { ReflectionRepository } from './reflection.repository.js';
import { ReflectionService } from './reflection.service.js';

@Module({
  controllers: [ReflectionController],
  providers: [
    { provide: IReflectionRepository, useClass: ReflectionRepository },
    { provide: IReflectionService, useClass: ReflectionService },
  ],
  exports: [IReflectionService],
})
export class ReflectionsModule {}
