import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetRentalExperimentStatsUseCase,
} from '../../../application/use-cases/admin/get-rental-experiment-stats.use-case'
import { AbExperimentService } from '../../../shared/infrastructure/experiment/ab-experiment.service'

export class UpdateExperimentSettingsDto {
  key!: string
  status?: 'ACTIVE' | 'PAUSED'
  weights?: Record<string, number>
  overrides?: Record<string, string>
  defaultVariant?: string
  description?: string
}

@Controller('admin/experiments')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminExperimentController {
  constructor(
    private readonly getRentalExperimentStatsUseCase: GetRentalExperimentStatsUseCase,
    private readonly abExperimentService: AbExperimentService,
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

  @Get('settings')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getSettings(@Query('key') key?: string) {
    if (key) {
      const config = this.abExperimentService.getConfig(key)
      return {
        success: true,
        data: config,
      }
    }
    const configs = this.abExperimentService.getAllConfigs()
    return {
      success: true,
      data: configs,
    }
  }

  @Patch('settings')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async updateSettings(@Body() body: UpdateExperimentSettingsDto) {
    const updated = this.abExperimentService.updateConfig(body.key, body)
    return {
      success: true,
      data: updated,
    }
  }
}
