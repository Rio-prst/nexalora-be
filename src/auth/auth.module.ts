import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { IAuthService } from './interfaces/auth.service.interface.js';

@Module({
  providers: [{ provide: IAuthService, useClass: AuthService }],
  exports: [IAuthService],
})
export class AuthModule {}
