import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { SqliteService } from './sqlite.service'
import { PublicController } from './public.controller'
import { TenantAuthController, TenantJwtGuard } from './tenant-auth.controller'
import { PaymentController } from './payment.controller'
import { DocumentsController } from './documents.controller'

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-key'),
        signOptions: { expiresIn: '7d' }, // longer for dev/mock
      }),
    }),
  ],
  controllers: [PublicController, TenantAuthController, PaymentController, DocumentsController],
  providers: [SqliteService, TenantJwtGuard],
  exports: [SqliteService],
})
export class UpwardPayModule {}
