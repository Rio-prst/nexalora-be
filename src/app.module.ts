import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { InterestsModule } from './interests/interest-submission.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { RecommendationsModule } from './recommendations/recommendation.module.js';
import { SimulationsModule } from './simulations/attempt.module.js';
import { ReflectionsModule } from './reflections/reflection.module.js';
import { ComparisonsModule } from './comparisons/comparison.module.js';
import { PlansModule } from './plans/plan.module.js';
import { PassportsModule } from './passports/passport.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    HealthModule,
    ProfileModule,
    InterestsModule,
    CatalogModule,
    RecommendationsModule,
    SimulationsModule,
    ReflectionsModule,
    ComparisonsModule,
    PlansModule,
    PassportsModule,
  ],
  providers: [
    // Order matters: authentication must resolve the principal before roles
    // are checked. Both are global, so endpoints are protected by default and
    // opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
