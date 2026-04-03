import { Controller, Get, Req, ForbiddenException } from '@nestjs/common'
import { AppService } from './app.service'
import { SendDailyReportUseCase } from '@application/use-cases/analytics/send-daily-report.use-case'
import { RunTuesdayCampaignUseCase } from '@application/use-cases/campaign/run-tuesday-campaign.use-case'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly sendDailyReportUseCase: SendDailyReportUseCase,
    private readonly runTuesdayCampaignUseCase: RunTuesdayCampaignUseCase,
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

    return this.sendDailyReportUseCase.execute()
  }

  @Get('cron/tuesday-campaign')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async triggerTuesdayCampaign(@Req() req: any) {
    const secret = req.headers['authorization']?.split(' ')[1]
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid cron secret')
    }

    return this.runTuesdayCampaignUseCase.execute()
  }

  @Get()
  root(): { message: string } {
    return { message: 'Upward API is running' }
  }
}
