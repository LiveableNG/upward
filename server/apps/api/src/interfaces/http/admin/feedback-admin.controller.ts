import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetFeedbackAdminUseCase } from '../../../application/use-cases/feedback/get-feedback-admin.use-case'
import { GetFeedbackStatsAdminUseCase } from '../../../application/use-cases/feedback/get-feedback-stats-admin.use-case'

@Controller('admin/feedback')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class FeedbackAdminController {
  constructor(
    private readonly getFeedbackAdminUseCase: GetFeedbackAdminUseCase,
    private readonly getFeedbackStatsAdminUseCase: GetFeedbackStatsAdminUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFeedback(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') typeFilter?: string,
    @Query('source') sourceFilter?: string,
    @Query('search') search?: string,
  ) {
    return this.getFeedbackAdminUseCase.execute({
      page,
      limit,
      typeFilter,
      sourceFilter,
      search,
    })
  }

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFeedbackStats() {
    return this.getFeedbackStatsAdminUseCase.execute()
  }
}
