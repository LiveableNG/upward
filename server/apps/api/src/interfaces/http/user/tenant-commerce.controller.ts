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
import { VerifyCommercePaymentUseCase } from '../../../application/commerce/use-cases/verify-commerce-payment.use-case'
import { GetCommerceReceiptPdfUseCase } from '../../../application/commerce/use-cases/get-commerce-receipt-pdf.use-case'
import { CreateCommerceDisputeUseCase } from '../../../application/commerce/use-cases/create-commerce-dispute.use-case'
import { CreateCommerceInquiryUseCase } from '../../../application/commerce/use-cases/create-commerce-inquiry.use-case'
import { CreateServiceQuoteOrderUseCase } from '../../../application/commerce/use-cases/create-service-quote-order.use-case'
import { PostCommerceOrderMessageUseCase } from '../../../application/commerce/use-cases/post-commerce-order-message.use-case'
import { DeclineServiceQuoteUseCase } from '../../../application/commerce/use-cases/decline-service-quote.use-case'
import { PreviewCommerceOrderDto } from '../../../application/commerce/dto/preview-commerce-order.dto'
import { CreateCommerceOrderDto } from '../../../application/commerce/dto/create-commerce-order.dto'
import { InitializeCommercePaymentDto } from '../../../application/commerce/dto/initialize-commerce-payment.dto'
import { VerifyCommercePaymentDto } from '../../../application/commerce/dto/verify-commerce-payment.dto'
import { GetTenantOrdersFilterDto } from '../../../application/commerce/dto/tenant-commerce-order.dto'
import { CreateCommerceDisputeDto } from '../../../application/commerce/dto/commerce-dispute.dto'
import { CreateCommerceInquiryDto } from '../../../application/commerce/dto/commerce-inquiry.dto'
import {
  CreateServiceQuoteOrderDto,
  DeclineServiceQuoteDto,
  PostCommerceOrderMessageDto,
} from '../../../application/commerce/dto/service-quote.dto'

@Controller('user/commerce/orders')
@UseGuards(JwtAuthGuard)
export class TenantCommerceController {
  constructor(
    private readonly previewCommerceOrderUseCase: PreviewCommerceOrderUseCase,
    private readonly createCommerceOrderUseCase: CreateCommerceOrderUseCase,
    private readonly getTenantOrdersUseCase: GetTenantOrdersUseCase,
    private readonly getTenantOrderDetailUseCase: GetTenantOrderDetailUseCase,
    private readonly initializeCommercePaymentUseCase: InitializeCommercePaymentUseCase,
    private readonly verifyCommercePaymentUseCase: VerifyCommercePaymentUseCase,
    private readonly getCommerceReceiptPdfUseCase: GetCommerceReceiptPdfUseCase,
    private readonly createCommerceDisputeUseCase: CreateCommerceDisputeUseCase,
    private readonly createCommerceInquiryUseCase: CreateCommerceInquiryUseCase,
    private readonly createServiceQuoteOrderUseCase: CreateServiceQuoteOrderUseCase,
    private readonly postCommerceOrderMessageUseCase: PostCommerceOrderMessageUseCase,
    private readonly declineServiceQuoteUseCase: DeclineServiceQuoteUseCase,
  ) {}

  @Post('quote')
  @HttpCode(HttpStatus.CREATED)
  async createServiceQuoteOrder(
    @Req() req: any,
    @Body() dto: CreateServiceQuoteOrderDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    const data = await this.createServiceQuoteOrderUseCase.execute({
      userUuid,
      dto,
    })
    return { data }
  }

  @Post('sub-orders/:subOrderUuid/messages')
  @HttpCode(HttpStatus.CREATED)
  async postSubOrderMessage(
    @Req() req: any,
    @Param('subOrderUuid') subOrderUuid: string,
    @Body() dto: PostCommerceOrderMessageDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    const data = await this.postCommerceOrderMessageUseCase.execute({
      subOrderUuid,
      senderType: 'TENANT',
      senderUserUuid: userUuid,
      message: dto.message,
    })
    return { data }
  }

  @Post(':uuid/decline-quote')
  @HttpCode(HttpStatus.OK)
  async declineQuote(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() dto: DeclineServiceQuoteDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    const data = await this.declineServiceQuoteUseCase.execute({
      userUuid,
      orderUuid: uuid,
      reason: dto?.reason,
    })
    return { data }
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewOrder(@Req() req: any, @Body() dto: PreviewCommerceOrderDto) {
    const userUuid = req.user?.id || req.user?.sub
    const data = await this.previewCommerceOrderUseCase.execute(dto, userUuid)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Req() req: any, @Body() dto: CreateCommerceOrderDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.createCommerceOrderUseCase.execute(userUuid, dto)
    return { data }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTenantOrders(
    @Req() req: any,
    @Query() filter: GetTenantOrdersFilterDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.getTenantOrdersUseCase.execute(userUuid, filter)
    return { data }
  }

  @Get(':uuid')
  @HttpCode(HttpStatus.OK)
  async getTenantOrderDetail(@Req() req: any, @Param('uuid') uuid: string) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.getTenantOrderDetailUseCase.execute(userUuid, uuid)
    return { data }
  }

  @Post(':uuid/pay')
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() dto?: InitializeCommercePaymentDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for']
    const data = await this.initializeCommercePaymentUseCase.execute({
      userUuid,
      orderUuid: uuid,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      applyVoucher: dto?.applyVoucher,
    })
    return { data }
  }

  @Post(':uuid/verify-payment')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() dto: VerifyCommercePaymentDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.verifyCommercePaymentUseCase.execute({
      userUuid,
      orderUuid: uuid,
      reference: dto.reference,
    })
    return { data }
  }

  @Get(':uuid/receipt')
  async getReceipt(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Res({ passthrough: false }) res: any,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const { buffer, filename } = await this.getCommerceReceiptPdfUseCase.execute(
      userUuid,
      uuid,
    )

    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(buffer)
  }

  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  async createDispute(@Req() req: any, @Body() dto: CreateCommerceDisputeDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.createCommerceDisputeUseCase.execute(userUuid, dto)
    return { data }
  }

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  async createInquiry(@Req() req: any, @Body() dto: CreateCommerceInquiryDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }

    const data = await this.createCommerceInquiryUseCase.execute(userUuid, dto)
    return { data }
  }
}
