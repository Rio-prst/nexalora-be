import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';
import { ICatalogRepository } from './interfaces/catalog.repository.interface.js';
import { ICatalogService } from './interfaces/catalog.service.interface.js';

@Module({
  controllers: [CatalogController],
  providers: [
    { provide: ICatalogRepository, useClass: CatalogRepository },
    { provide: ICatalogService, useClass: CatalogService },
  ],
  exports: [ICatalogService],
})
export class CatalogModule {}
