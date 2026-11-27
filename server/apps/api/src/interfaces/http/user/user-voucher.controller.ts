import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { GetUserVoucherSummaryUseCase } from '../../../application/vouchers/use-cases/get-user-voucher-summary.use-case'

@Controller('user/vouchers')
@UseGuards(JwtAuthGuard)
export class UserVoucherController {
  constructor(
    private readonly getUserVoucherSummaryUseCase: GetUserVoucherSummaryUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyVouchers(@Req() req: any) {
    const userIdentifier = req.user?.id || req.user?.sub
    if (!userIdentifier) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.getUserVoucherSummaryUseCase.execute(userIdentifier)
    return {
      data: {
        wallet: data.wallet,
        ledger: data.ledger.map((entry) => ({
          id: entry.id,
          uuid: entry.uuid,
          type: entry.type,
          amountKobo: entry.amountKobo,
          amountNaira: entry.amountNaira,
          balanceAfterKobo: entry.balanceAfterKobo,
          balanceAfterNaira: entry.balanceAfterNaira,
          reason: entry.reason,
          campaign: entry.campaign
            ? { code: entry.campaign.code, name: entry.campaign.name, type: entry.campaign.type }
            : null,
          order: entry.order
            ? { uuid: entry.order.uuid, orderNumber: entry.order.orderNumber }
            : null,
          createdAt: entry.createdAt,
        })),
      },
    }
  }
}
