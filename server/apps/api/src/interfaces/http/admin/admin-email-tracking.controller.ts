import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { GetEmailClickTrackingStatsUseCase, GetEmailClickTrackingQuery } from '../../../application/use-cases/admin/get-email-click-tracking-stats.use-case'

@Controller('admin/email-tracking')
@UseGuards(AdminJwtAuthGuard)
export class AdminEmailTrackingController {
  constructor(
    private readonly getEmailClickTrackingStatsUseCase: GetEmailClickTrackingStatsUseCase,
  ) {}

  @Get()
  async getTrackingStats(@Query() query: GetEmailClickTrackingQuery) {
    return this.getEmailClickTrackingStatsUseCase.execute(query)
  }
}
