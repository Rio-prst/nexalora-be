import { Module } from '@nestjs/common';
import { CatalogDirectoryController } from './catalog-directory.controller.js';
import { CatalogDirectoryRepository } from './catalog-directory.repository.js';
import { ICatalogDirectoryRepository } from './interfaces/catalog-directory.repository.interface.js';
import { IMissionRepository } from './interfaces/mission.repository.interface.js';
import { MissionController } from './mission.controller.js';
import { MissionRepository } from './mission.repository.js';

@Module({
  controllers: [MissionController, CatalogDirectoryController],
  providers: [
    { provide: IMissionRepository, useClass: MissionRepository },
    {
      provide: ICatalogDirectoryRepository,
      useClass: CatalogDirectoryRepository,
    },
  ],
  exports: [IMissionRepository, ICatalogDirectoryRepository],
})
export class MissionsModule {}
