import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AdminRole } from '@upward/shared-types'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminGetRewardsDashboardUseCase } from '../../../application/rewards/use-cases/admin-get-rewards-dashboard.use-case'
import { AdminSearchRewardUsersUseCase } from '../../../application/rewards/use-cases/admin-search-reward-users.use-case'
import { AdminGetUserRewardDetailUseCase } from '../../../application/rewards/use-cases/admin-get-user-reward-detail.use-case'
import { AdminAwardVoucherUseCase } from '../../../application/rewards/use-cases/admin-award-voucher.use-case'
import { AdminAwardCashbackUseCase } from '../../../application/rewards/use-cases/admin-award-cashback.use-case'
import { AdminUpdateRewardRuleUseCase } from '../../../application/rewards/use-cases/admin-update-reward-rule.use-case'
import { AdminTopUpCashbackPoolUseCase } from '../../../application/rewards/use-cases/admin-top-up-cashback-pool.use-case'
import {
  AdminAwardCashbackDto,
  AdminAwardVoucherDto,
  AdminTopUpCashbackPoolDto,
  AdminUpdateRewardRuleDto,
} from '../../../application/rewards/dto/rewards.dto'

@Controller('admin/rewards')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminRewardsController {
  constructor(
    private readonly getDashboardUseCase: AdminGetRewardsDashboardUseCase,
    private readonly searchUsersUseCase: AdminSearchRewardUsersUseCase,
    private readonly getUserDetailUseCase: AdminGetUserRewardDetailUseCase,
    private readonly awardVoucherUseCase: AdminAwardVoucherUseCase,
    private readonly awardCashbackUseCase: AdminAwardCashbackUseCase,
    private readonly updateRuleUseCase: AdminUpdateRewardRuleUseCase,
    private readonly topUpPoolUseCase: AdminTopUpCashbackPoolUseCase,
  ) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: string,
    @Query('campaignTag') campaignTag?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.getDashboardUseCase.execute({
      status,
      sourceType,
      campaignTag,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    })
    return { data }
  }

  @Get('users/search')
  @HttpCode(HttpStatus.OK)
  async searchUsers(@Query('q') q?: string, @Query('limit') limit?: string) {
    const data = await this.searchUsersUseCase.execute(q || '', limit ? Number(limit) : 25)
    return { data }
  }

  @Get('users/:userUuid')
  @HttpCode(HttpStatus.OK)
  async getUserRewardDetail(@Param('userUuid') userUuid: string) {
    const data = await this.getUserDetailUseCase.execute(userUuid)
    return { data }
  }

  @Post('vouchers/award')
  @HttpCode(HttpStatus.CREATED)
  async awardVoucher(@Req() req: any, @Body() dto: AdminAwardVoucherDto) {
    const data = await this.awardVoucherUseCase.execute({
      dto,
      adminId: req.user?.id || req.user?.sub,
      adminEmail: req.user?.email,
    })
    return { data }
  }

  @Post('cashback/award')
  @HttpCode(HttpStatus.CREATED)
  async awardCashback(@Req() req: any, @Body() dto: AdminAwardCashbackDto) {
    const data = await this.awardCashbackUseCase.execute({
      dto,
      adminId: req.user?.id || req.user?.sub,
      adminEmail: req.user?.email,
    })
    return { data }
  }

  @Patch('rules/:triggerKey')
  @HttpCode(HttpStatus.OK)
  async updateRule(
    @Req() req: any,
    @Param('triggerKey') triggerKey: string,
    @Body() dto: AdminUpdateRewardRuleDto,
  ) {
    const data = await this.updateRuleUseCase.execute({
      triggerKey,
      dto,
      adminId: req.user?.id || req.user?.sub,
    })
    return { data }
  }

  @Post('cashback-pool/top-up')
  @HttpCode(HttpStatus.OK)
  async topUpCashbackPool(@Req() req: any, @Body() dto: AdminTopUpCashbackPoolDto) {
    const data = await this.topUpPoolUseCase.execute({
      dto,
      adminId: req.user?.id || req.user?.sub,
    })
    return { data }
  }
}
