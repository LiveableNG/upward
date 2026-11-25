import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { AdminGrantVoucherUseCase } from '../../../application/vouchers/use-cases/admin-grant-voucher.use-case'
import { GetUserVoucherSummaryUseCase } from '../../../application/vouchers/use-cases/get-user-voucher-summary.use-case'
import { AdminGrantVoucherDto } from '../../../application/vouchers/dto/voucher.dto'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'

@Controller('admin/vouchers')
@UseGuards(AdminJwtAuthGuard)
export class AdminVoucherController {
  constructor(
    private readonly adminGrantVoucherUseCase: AdminGrantVoucherUseCase,
    private readonly getUserVoucherSummaryUseCase: GetUserVoucherSummaryUseCase,
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo: VoucherRepository,
  ) {}

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  async listCampaigns() {
    const campaigns = await this.voucherRepo.listCampaigns()
    return {
      data: campaigns.map((c) => ({
        id: c.id,
        uuid: c.uuid,
        code: c.code,
        name: c.name,
        description: c.description,
        type: c.type,
        defaultAmountKobo: c.defaultAmountKobo.toString(),
        defaultAmountNaira: Number(c.defaultAmountKobo) / 100,
        maxBudgetKobo: c.maxBudgetKobo ? c.maxBudgetKobo.toString() : null,
        spentKobo: c.spentKobo.toString(),
        spentNaira: Number(c.spentKobo) / 100,
        isActive: c.isActive,
        startsAt: c.startsAt,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    }
  }

  @Get('users/:userIdentifier')
  @HttpCode(HttpStatus.OK)
  async getUserVoucherSummary(@Param('userIdentifier') userIdentifier: string) {
    const data = await this.getUserVoucherSummaryUseCase.execute(userIdentifier)
    return { data }
  }

  @Post('users/:userIdentifier/grant')
  @HttpCode(HttpStatus.CREATED)
  async grantUserVoucher(
    @Req() req: any,
    @Param('userIdentifier') userIdentifier: string,
    @Body() dto: AdminGrantVoucherDto,
  ) {
    const adminId = req.user?.id || req.user?.sub
    if (!adminId) {
      throw new UnauthorizedException('Admin authentication required')
    }

    const data = await this.adminGrantVoucherUseCase.execute({
      userIdentifier,
      adminId: String(adminId),
      dto,
    })

    return {
      message: data.alreadyApplied
        ? 'Voucher grant already processed (idempotent)'
        : 'Voucher credited successfully',
      data,
    }
  }
}
