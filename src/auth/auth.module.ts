import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { IAuthService } from './interfaces/auth.service.interface.js';

@Module({
  controllers: [AuthController],
  providers: [{ provide: IAuthService, useClass: AuthService }],
  exports: [IAuthService],
})
export class AuthModule {}
