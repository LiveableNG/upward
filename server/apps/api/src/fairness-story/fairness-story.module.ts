import { Module } from '@nestjs/common'
import { FairnessStoryController } from './fairness-story.controller'
import { FairnessStoryService } from './fairness-story.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [FairnessStoryController],
  providers: [FairnessStoryService],
  exports: [FairnessStoryService],
})
export class FairnessStoryModule {}
