import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IProfileRepository } from './interfaces/profile.repository.interface.js';
import { IProfileExportRepository } from './interfaces/profile-export.repository.interface.js';
import { IProfileService } from './interfaces/profile.service.interface.js';
import { ProfileController } from './profile.controller.js';
import { ProfileExportRepository } from './profile-export.repository.js';
import { ProfileProvisioningInterceptor } from './profile-provisioning.interceptor.js';
import { ProfileProvisioningService } from './profile-provisioning.service.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
  controllers: [ProfileController],
  providers: [
    { provide: IProfileRepository, useClass: ProfileRepository },
    { provide: IProfileService, useClass: ProfileService },
    { provide: IProfileExportRepository, useClass: ProfileExportRepository },
    ProfileProvisioningService,
    // Global so that every private endpoint can assume the caller's profile row
    // exists. Registered as an interceptor rather than inside a guard because
    // it is a write, and guards should stay cheap enough to run on every
    // request including ones that never touch the database.
    {
      provide: APP_INTERCEPTOR,
      useClass: ProfileProvisioningInterceptor,
    },
  ],
  exports: [IProfileService],
})
export class ProfileModule {}
