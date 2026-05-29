import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EmailService } from './email.service'
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module'
import { S3Module } from '../../../shared/infrastructure/common/s3/s3.module'

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, S3Module],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
