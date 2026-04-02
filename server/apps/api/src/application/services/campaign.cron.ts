import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CampaignService } from './campaign.service'

@Injectable()
export class CampaignCronTask {
  private readonly logger = new Logger(CampaignCronTask.name)

  constructor(private readonly campaignService: CampaignService) {}

  @Cron('0 19 * * 2', {
    name: 'tuesday-campaign',
    timeZone: 'Africa/Lagos',
  })
  async handleTuesdayCampaign() {
    this.logger.log('[CronTask] ➜ Tuesday campaign cron triggered')
    try {
      const result = await this.campaignService.runTuesdayCampaign()
      this.logger.log(
        `[CronTask] ✓ Campaign done — processed: ${result.processed}, sent: ${result.sent}, failed: ${result.failed}, skipped: ${result.skipped}`,
      )
    } catch (err) {
      this.logger.error('[CronTask] ✗ Campaign cron failed', err)
    }
  }
}
