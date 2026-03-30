import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { CampaignService } from './campaign.service'
import { CampaignController } from './campaign.controller'
import { CampaignCronTask } from './campaign.cron'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, EmailModule],
  providers: [CampaignService, CampaignCronTask],
  controllers: [CampaignController],
  exports: [CampaignService],
})
export class CampaignModule {}
