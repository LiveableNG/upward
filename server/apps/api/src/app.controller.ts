import { Controller, Get, Req, ForbiddenException } from '@nestjs/common'
import { AppService } from './app.service'
import { AdminService } from './admin/admin.service'
import { CampaignService } from './campaign/campaign.service'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminService: AdminService,
    private readonly campaignService: CampaignService,
  ) {}

  @Get('health')
  health(): { status: string; timestamp: string } {
    return this.appService.health()
  }

  @Get('cron/daily-report')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async triggerDailyReport(@Req() req: any) {
    const secret = req.headers['authorization']?.split(' ')[1]
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid cron secret')
    }

    return this.adminService.sendDailyReport()
  }

  @Get('cron/tuesday-campaign')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async triggerTuesdayCampaign(@Req() req: any) {
    const secret = req.headers['authorization']?.split(' ')[1]
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid cron secret')
    }

    return this.campaignService.runTuesdayCampaign()
  }

  @Get()
  root(): { message: string } {
    return { message: 'Upward API is running' }
  }
}
