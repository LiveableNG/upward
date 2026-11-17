import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'

// Use Cases
import { 
  GetFeeOverridesUseCase, 
  UpsertFeeOverrideUseCase, 
  DeleteFeeOverrideUseCase, 
  SearchFeeTargetsUseCase 
} from '../../../application/use-cases/admin/fee-overrides.use-cases'

@Controller('admin/fees')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
export class AdminFeesController {
  constructor(
    private readonly getFeeOverridesUseCase: GetFeeOverridesUseCase,
    private readonly upsertFeeOverrideUseCase: UpsertFeeOverrideUseCase,
    private readonly deleteFeeOverrideUseCase: DeleteFeeOverrideUseCase,
    private readonly searchFeeTargetsUseCase: SearchFeeTargetsUseCase,
    private readonly platformRatesService: PlatformRatesService,
  ) {}

  @Get('rates')
  async getPlatformRates() {
    const data = await this.platformRatesService.getRates()
    return { success: true, data }
  }

  @Put('rates')
  @Post('rates')
  async updatePlatformRates(
    @Body()
    body: {
      savingsEnabled?: boolean
      savingsAnnualRatePct?: number
      rentProtecRatePct?: number
      insurancePremiumPct?: number
      rentProtecMinMonths?: number
      maxSavingsMonths?: number
      partnerName?: string
      partnerShortName?: string
    },
    @Req() req: any,
  ) {
    const data = await this.platformRatesService.updateRates({
      savingsEnabled: body.savingsEnabled,
      savingsAnnualRatePct: body.savingsAnnualRatePct,
      rentProtecRatePct: body.rentProtecRatePct,
      insurancePremiumPct: body.insurancePremiumPct,
      rentProtecMinMonths: body.rentProtecMinMonths,
      maxSavingsMonths: body.maxSavingsMonths,
      partnerName: body.partnerName,
      partnerShortName: body.partnerShortName,
      updatedByAdminId: req.user?.id || req.user?.sub,
    })
    return { success: true, data }
  }

  @Get('overrides')
  async getOverrides() {
    const data = await this.getFeeOverridesUseCase.execute()
    return { success: true, data }
  }

  @Get('targets')
  async searchTargets(
    @Query('q') query?: string,
    @Query('type') filterType?: string,
    @Query('pmUuid') pmUuid?: string,
  ) {
    const data = await this.searchFeeTargetsUseCase.execute(query || '', filterType, pmUuid)
    return { success: true, data }
  }

  @Post('overrides')
  async upsertOverride(@Body() body: { targetType: string; targetId: string; fee: number }) {
    const data = await this.upsertFeeOverrideUseCase.execute(body)
    return { success: true, data }
  }

  @Delete('overrides/:type/:id')
  async deleteOverride(@Param('type') targetType: string, @Param('id') targetId: string) {
    await this.deleteFeeOverrideUseCase.execute(targetType, targetId)
    return { success: true, message: 'Override deleted successfully' }
  }
}
