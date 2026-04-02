import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { BaseAuthService } from './base-auth.service'
import { AdminAuthService } from './admin-auth.service'
import { TenantAuthService } from './tenant-auth.service'
import { AdminAuthController } from '@interfaces/http/admin/admin-auth.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-key'),
        signOptions: { expiresIn: '15m' }, // short-lived access token
      }),
    }),
  ],
  providers: [AdminAuthService, TenantAuthService, BaseAuthService, JwtStrategy],
  controllers: [AdminAuthController],
  exports: [AdminAuthService, TenantAuthService, BaseAuthService],
})
export class AuthModule {}
