import { Module } from '@nestjs/common'
import { FairnessStoryController } from './fairness-story.controller'
import { FairnessStoryService } from './fairness-story.service'
import { PrismaModule } from '../prisma/prisma.module'
import { S3Module } from '../common/s3/s3.module'

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [FairnessStoryController],
  providers: [FairnessStoryService],
  exports: [FairnessStoryService],
})
export class FairnessStoryModule {}
