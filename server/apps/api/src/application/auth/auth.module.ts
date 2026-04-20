import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { BaseAuthService } from './base-auth.service'
import { AdminAuthService } from './admin-auth.service'
import { UserAuthService } from './user-auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module'
import { S3Module } from '../../shared/infrastructure/common/s3/s3.module'

@Module({
  imports: [
    PrismaModule,
    S3Module,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-key'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [AdminAuthService, UserAuthService, BaseAuthService, JwtStrategy],
  exports: [AdminAuthService, UserAuthService, BaseAuthService, JwtModule],
})
export class AuthModule {}
