import { Controller, Get, Put, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { GetAppVersionPoliciesUseCase } from '../../../application/use-cases/system/get-app-version-policies.use-case'
import { UpdateAppVersionPolicyUseCase } from '../../../application/use-cases/system/update-app-version-policy.use-case'
import { ToggleAppForceUpdateUseCase } from '../../../application/use-cases/system/toggle-app-force-update.use-case'
import { UpdateAppVersionPolicyDto, ToggleAppForceUpdateDto } from '../dto/app-version-policy.dto'

@Controller('admin/app-version-policies')
@UseGuards(AdminJwtAuthGuard)
export class AdminAppVersionController {
  constructor(
    private readonly getAppVersionPoliciesUseCase: GetAppVersionPoliciesUseCase,
    private readonly updateAppVersionPolicyUseCase: UpdateAppVersionPolicyUseCase,
    private readonly toggleAppForceUpdateUseCase: ToggleAppForceUpdateUseCase,
  ) {}

  @Get()
  async getPolicies() {
    const policies = await this.getAppVersionPoliciesUseCase.execute()
    return {
      success: true,
      data: policies,
    }
  }

  @Put(':platform')
  async updatePolicy(
    @Param('platform') platform: string,
    @Body() dto: UpdateAppVersionPolicyDto,
  ) {
    const updated = await this.updateAppVersionPolicyUseCase.execute({
      ...dto,
      platform,
      app: dto.app || 'upward-pay',
    })
    return {
      success: true,
      data: updated,
    }
  }

  @Patch(':platform/toggle')
  async togglePolicy(
    @Param('platform') platform: string,
    @Body() dto: ToggleAppForceUpdateDto,
  ) {
    const updated = await this.toggleAppForceUpdateUseCase.execute({
      app: dto.app || 'upward-pay',
      platform,
      forceUpdate: dto.forceUpdate,
      maintenanceMode: dto.maintenanceMode,
    })
    return {
      success: true,
      data: updated,
    }
  }
}
