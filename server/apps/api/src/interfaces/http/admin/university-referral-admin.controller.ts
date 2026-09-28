import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetUniversityReferralStatsUseCase,
  GetUniversityReferralsAdminUseCase,
  UpdateUniversityReferralAdminUseCase,
  DeleteUniversityReferralAdminUseCase,
} from '../../../application/use-cases/university-referral/get-university-referrals-admin.use-case'

@Controller('admin/university/referrals')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityReferralAdminController {
  constructor(
    private readonly getStatsUseCase: GetUniversityReferralStatsUseCase,
    private readonly getReferralsUseCase: GetUniversityReferralsAdminUseCase,
    private readonly updateReferralUseCase: UpdateUniversityReferralAdminUseCase,
    private readonly deleteReferralUseCase: DeleteUniversityReferralAdminUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats() {
    const stats = await this.getStatsUseCase.execute()
    return {
      success: true,
      data: stats,
    }
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getReferrals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('rewardStatus') rewardStatus?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 50

    const result = await this.getReferralsUseCase.execute({
      page: pageNum,
      limit: limitNum,
      status,
      rewardStatus,
      search,
    })

    return {
      success: true,
      data: result.data.map(ref => ref.toObject()),
      meta: result.meta,
    }
  }

  @Patch(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async updateReferral(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string
      rewardStatus?: string
      rewardPercentage?: number
      rewardAmount?: number
      programFeePaid?: number
      paymentRef?: string
      notes?: string
    },
  ) {
    const updated = await this.updateReferralUseCase.execute({
      id,
      status: body.status,
      rewardStatus: body.rewardStatus,
      rewardPercentage: body.rewardPercentage,
      rewardAmount: body.rewardAmount,
      programFeePaid: body.programFeePaid,
      paymentRef: body.paymentRef,
      notes: body.notes,
    })

    return {
      success: true,
      message: 'Referral updated successfully',
      data: updated.toObject(),
    }
  }

  @Delete(':id')
  @Roles(AdminRole.DEVELOPER)
  async deleteReferral(@Param('id') id: string) {
    await this.deleteReferralUseCase.execute(id)
    return {
      success: true,
      message: 'Referral deleted successfully',
    }
  }
}
