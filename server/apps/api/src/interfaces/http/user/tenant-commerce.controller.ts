import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PreviewCommerceOrderUseCase } from '../../../application/commerce/use-cases/preview-commerce-order.use-case'
import { CreateCommerceOrderUseCase } from '../../../application/commerce/use-cases/create-commerce-order.use-case'
import { GetTenantOrdersUseCase } from '../../../application/commerce/use-cases/get-tenant-orders.use-case'
import { GetTenantOrderDetailUseCase } from '../../../application/commerce/use-cases/get-tenant-order-detail.use-case'
import { InitializeCommercePaymentUseCase } from '../../../application/commerce/use-cases/initialize-commerce-payment.use-case'
import { GetCommerceReceiptPdfUseCase } from '../../../application/commerce/use-cases/get-commerce-receipt-pdf.use-case'
import { CreateCommerceDisputeUseCase } from '../../../application/commerce/use-cases/create-commerce-dispute.use-case'
import { PreviewCommerceOrderDto } from '../../../application/commerce/dto/preview-commerce-order.dto'
import { CreateCommerceOrderDto } from '../../../application/commerce/dto/create-commerce-order.dto'
import { GetTenantOrdersFilterDto } from '../../../application/commerce/dto/tenant-commerce-order.dto'
import { CreateCommerceDisputeDto } from '../../../application/commerce/dto/commerce-dispute.dto'

@Controller('user/commerce/orders')
@UseGuards(JwtAuthGuard)
export class TenantCommerceController {
  constructor(
    private readonly previewCommerceOrderUseCase: PreviewCommerceOrderUseCase,
    private readonly createCommerceOrderUseCase: CreateCommerceOrderUseCase,
    private readonly getTenantOrdersUseCase: GetTenantOrdersUseCase,
    private readonly getTenantOrderDetailUseCase: GetTenantOrderDetailUseCase,
    private readonly initializeCommercePaymentUseCase: InitializeCommercePaymentUseCase,
    private readonly getCommerceReceiptPdfUseCase: GetCommerceReceiptPdfUseCase,
    private readonly createCommerceDisputeUseCase: CreateCommerceDisputeUseCase,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewOrder(@Body() dto: PreviewCommerceOrderDto) {
    const data = await this.previewCommerceOrderUseCase.execute(dto)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Req() req: any, @Body() dto: CreateCommerceOrderDto) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.createCommerceOrderUseCase.execute(Number(userId), dto)
    return { data }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTenantOrders(
    @Req() req: any,
    @Query() filter: GetTenantOrdersFilterDto,
  ) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.getTenantOrdersUseCase.execute(Number(userId), filter)
    return { data }
  }

  @Get(':uuid')
  @HttpCode(HttpStatus.OK)
  async getTenantOrderDetail(@Req() req: any, @Param('uuid') uuid: string) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.getTenantOrderDetailUseCase.execute(Number(userId), uuid)
    return { data }
  }

  @Post(':uuid/pay')
  @HttpCode(HttpStatus.OK)
  async initializePayment(@Req() req: any, @Param('uuid') uuid: string) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for']
    const data = await this.initializeCommercePaymentUseCase.execute({
      userId: Number(userId),
      orderUuid: uuid,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
    })
    return { data }
  }

  @Get(':uuid/receipt')
  async getReceipt(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Res({ passthrough: false }) res: any,
  ) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const { buffer, filename } = await this.getCommerceReceiptPdfUseCase.execute(
      Number(userId),
      uuid,
    )

    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(buffer)
  }

  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  async createDispute(@Req() req: any, @Body() dto: CreateCommerceDisputeDto) {
    const userId = req.user?.id || req.user?.sub
    if (!userId) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.createCommerceDisputeUseCase.execute(Number(userId), dto)
    return { data }
  }
}
