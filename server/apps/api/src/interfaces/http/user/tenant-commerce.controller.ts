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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PreviewCommerceOrderUseCase } from '../../../application/commerce/use-cases/preview-commerce-order.use-case'
import { CreateCommerceOrderUseCase } from '../../../application/commerce/use-cases/create-commerce-order.use-case'
import { GetTenantOrdersUseCase } from '../../../application/commerce/use-cases/get-tenant-orders.use-case'
import { GetTenantOrderDetailUseCase } from '../../../application/commerce/use-cases/get-tenant-order-detail.use-case'
import { PreviewCommerceOrderDto } from '../../../application/commerce/dto/preview-commerce-order.dto'
import { CreateCommerceOrderDto } from '../../../application/commerce/dto/create-commerce-order.dto'
import { GetTenantOrdersFilterDto } from '../../../application/commerce/dto/tenant-commerce-order.dto'

@Controller('user/commerce/orders')
@UseGuards(JwtAuthGuard)
export class TenantCommerceController {
  constructor(
    private readonly previewCommerceOrderUseCase: PreviewCommerceOrderUseCase,
    private readonly createCommerceOrderUseCase: CreateCommerceOrderUseCase,
    private readonly getTenantOrdersUseCase: GetTenantOrdersUseCase,
    private readonly getTenantOrderDetailUseCase: GetTenantOrderDetailUseCase,
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
}
