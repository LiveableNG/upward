import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetRentalExperimentStatsUseCase,
} from '../../../application/use-cases/admin/get-rental-experiment-stats.use-case'

@Controller('admin/experiments')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminExperimentController {
  constructor(
    private readonly getRentalExperimentStatsUseCase: GetRentalExperimentStatsUseCase,
  ) {}

  @Get('rental-onboarding')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getRentalOnboardingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('variant') variant?: string,
  ) {
    return this.getRentalExperimentStatsUseCase.execute({
      startDate,
      endDate,
      variant,
    })
  }
}
