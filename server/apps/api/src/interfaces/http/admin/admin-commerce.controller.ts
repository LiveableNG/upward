import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AdminRole } from '@upward/shared-types'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminGetCommerceOrdersUseCase } from '../../../application/commerce/use-cases/admin/admin-get-commerce-orders.use-case'
import { AdminGetCommerceOrderDetailUseCase } from '../../../application/commerce/use-cases/admin/admin-get-commerce-order-detail.use-case'
import { AdminUpdateSubOrderFulfilmentUseCase } from '../../../application/commerce/use-cases/admin/admin-update-sub-order-fulfilment.use-case'
import {
  AdminGetCommerceOrdersFilterDto,
  AdminUpdateFulfilmentDto,
} from '../../../application/commerce/dto/admin-commerce.dto'

@Controller('admin/commerce')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminCommerceController {
  constructor(
    private readonly getCommerceOrdersUseCase: AdminGetCommerceOrdersUseCase,
    private readonly getCommerceOrderDetailUseCase: AdminGetCommerceOrderDetailUseCase,
    private readonly updateSubOrderFulfilmentUseCase: AdminUpdateSubOrderFulfilmentUseCase,
  ) {}

  @Get('orders')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async getOrders(@Query() filter: AdminGetCommerceOrdersFilterDto) {
    const result = await this.getCommerceOrdersUseCase.execute(filter)
    return { data: result }
  }

  @Get('orders/:uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async getOrderDetail(@Param('uuid') uuid: string) {
    const data = await this.getCommerceOrderDetailUseCase.execute(uuid)
    return { data }
  }

  @Patch('sub-orders/:uuid/fulfilment')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async updateSubOrderFulfilment(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() dto: AdminUpdateFulfilmentDto,
  ) {
    const adminId = req.user?.uuid || String(req.user?.id || 'admin')
    const data = await this.updateSubOrderFulfilmentUseCase.execute(uuid, adminId, dto)
    return { data }
  }
}
