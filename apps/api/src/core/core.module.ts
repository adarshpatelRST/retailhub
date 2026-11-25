import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from './database/prisma.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { DataScopeGuard } from './security/data-scope.guard';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { JwtStrategy } from './security/jwt.strategy';
import { RolesGuard } from './security/roles.guard';

import { MailModule } from './mail/mail.module';
import { AuthService } from './security/auth.service';
import { AuthController } from './security/auth.controller';
import { UsersService } from './security/users.service';
import { UsersController } from './security/users.controller';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'retailhub-enterprise-jwt-secret-key-change-in-prod',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      },
    }),
    TerminusModule,
    MailModule,
  ],
  controllers: [HealthController, AuthController, UsersController],
  providers: [
    PrismaService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    DataScopeGuard,
    AuditInterceptor,
    TransformInterceptor,
    AllExceptionsFilter,
    AuthService,
    UsersService,
  ],
  exports: [
    PassportModule,
    JwtModule,
    PrismaService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    DataScopeGuard,
    AuditInterceptor,
    TransformInterceptor,
    AllExceptionsFilter,
    AuthService,
    UsersService,
    MailModule,
  ],
})
export class CoreModule {}
