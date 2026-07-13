import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'

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
  ) {}

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
