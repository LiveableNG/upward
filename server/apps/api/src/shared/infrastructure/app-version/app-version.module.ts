import { Module, Global } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { PrismaModule } from '../prisma/prisma.module'
import { VersionEnforcementInterceptor } from './version-enforcement.interceptor'

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionEnforcementInterceptor,
    },
  ],
})
export class AppVersionModule {}
