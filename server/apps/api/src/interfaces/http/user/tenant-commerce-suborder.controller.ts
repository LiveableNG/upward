import {
  Body,
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
import { ConfirmSubOrderReceiptInputDto } from '../../../application/commerce/dto/confirm-receipt.dto'

@Controller('user/commerce/sub-orders')
@UseGuards(JwtAuthGuard)
export class TenantCommerceSubOrderController {
  constructor(
    private readonly confirmReceiptUseCase: TenantConfirmSubOrderReceiptUseCase,
  ) {}

  @Post(':uuid/confirm-receipt')
  @HttpCode(HttpStatus.OK)
  async confirmReceipt(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() body?: ConfirmSubOrderReceiptInputDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.confirmReceiptUseCase.execute(userUuid, uuid, body)
    return { data }
  }
}
