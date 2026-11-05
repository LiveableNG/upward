import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { TenantConfirmSubOrderReceiptUseCase } from '../../../application/commerce/use-cases/tenant-confirm-sub-order-receipt.use-case'

@Controller('user/commerce/sub-orders')
@UseGuards(JwtAuthGuard)
export class TenantCommerceSubOrderController {
  constructor(
    private readonly confirmReceiptUseCase: TenantConfirmSubOrderReceiptUseCase,
  ) {}

  @Post(':uuid/confirm-receipt')
  @HttpCode(HttpStatus.OK)
  async confirmReceipt(@Req() req: any, @Param('uuid') uuid: string) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.confirmReceiptUseCase.execute(Number(userId), uuid)
    return { data }
  }
}
