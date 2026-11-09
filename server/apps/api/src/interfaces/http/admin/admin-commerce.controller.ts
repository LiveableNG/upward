import {
  Body,
  Controller,
  Delete,
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
import { AdminGetCommerceOrdersUseCase } from '../../../application/commerce/use-cases/admin/admin-get-commerce-orders.use-case'
import { AdminGetCommerceOrderDetailUseCase } from '../../../application/commerce/use-cases/admin/admin-get-commerce-order-detail.use-case'
import { AdminUpdateSubOrderFulfilmentUseCase } from '../../../application/commerce/use-cases/admin/admin-update-sub-order-fulfilment.use-case'
import { AdminResolveCommerceDisputeUseCase } from '../../../application/commerce/use-cases/admin/admin-resolve-commerce-dispute.use-case'
import { AdminGetCommerceDisputesUseCase } from '../../../application/commerce/use-cases/admin/admin-get-commerce-disputes.use-case'
import { GetDeliveryZonesUseCase } from '../../../application/commerce/use-cases/get-delivery-zones.use-case'
import { AdminCreateDeliveryZoneUseCase } from '../../../application/commerce/use-cases/admin/admin-create-delivery-zone.use-case'
import { AdminUpdateDeliveryZoneUseCase } from '../../../application/commerce/use-cases/admin/admin-update-delivery-zone.use-case'
import { AdminToggleDeliveryZoneUseCase } from '../../../application/commerce/use-cases/admin/admin-toggle-delivery-zone.use-case'
import { AdminDeleteDeliveryZoneUseCase } from '../../../application/commerce/use-cases/admin/admin-delete-delivery-zone.use-case'
import {
  AdminGetCommerceOrdersFilterDto,
  AdminUpdateFulfilmentDto,
} from '../../../application/commerce/dto/admin-commerce.dto'
import { ResolveCommerceDisputeDto } from '../../../application/commerce/dto/commerce-dispute.dto'
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
  ToggleDeliveryZoneDto,
} from '../../../application/commerce/dto/delivery-zone.dto'

@Controller('admin/commerce')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminCommerceController {
  constructor(
    private readonly getCommerceOrdersUseCase: AdminGetCommerceOrdersUseCase,
    private readonly getCommerceOrderDetailUseCase: AdminGetCommerceOrderDetailUseCase,
    private readonly updateSubOrderFulfilmentUseCase: AdminUpdateSubOrderFulfilmentUseCase,
    private readonly resolveCommerceDisputeUseCase: AdminResolveCommerceDisputeUseCase,
    private readonly getCommerceDisputesUseCase: AdminGetCommerceDisputesUseCase,
    private readonly getDeliveryZonesUseCase: GetDeliveryZonesUseCase,
    private readonly createDeliveryZoneUseCase: AdminCreateDeliveryZoneUseCase,
    private readonly updateDeliveryZoneUseCase: AdminUpdateDeliveryZoneUseCase,
    private readonly toggleDeliveryZoneUseCase: AdminToggleDeliveryZoneUseCase,
    private readonly deleteDeliveryZoneUseCase: AdminDeleteDeliveryZoneUseCase,
  ) {}

  @Get('disputes')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async getDisputes(@Query() filter: any) {
    const data = await this.getCommerceDisputesUseCase.execute(filter)
    return { data }
  }

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

  @Post('disputes/:uuid/resolve')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async resolveDispute(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Body() dto: ResolveCommerceDisputeDto,
  ) {
    const adminEmail = req.user?.email || 'admin@goodtenants.africa'
    const data = await this.resolveCommerceDisputeUseCase.execute(adminEmail, uuid, dto)
    return { data }
  }

  // --- Delivery Coverage Zones Management ---

  @Get('delivery-zones')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async getDeliveryZones() {
    const data = await this.getDeliveryZonesUseCase.execute()
    return { data }
  }

  @Post('delivery-zones')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.CREATED)
  async createDeliveryZone(@Body() dto: CreateDeliveryZoneDto) {
    const data = await this.createDeliveryZoneUseCase.execute(dto)
    return { data }
  }

  @Patch('delivery-zones/:uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async updateDeliveryZone(@Param('uuid') uuid: string, @Body() dto: UpdateDeliveryZoneDto) {
    const data = await this.updateDeliveryZoneUseCase.execute(uuid, dto)
    return { data }
  }

  @Patch('delivery-zones/:uuid/toggle-delivering')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async toggleDeliveryZone(@Param('uuid') uuid: string, @Body() dto: ToggleDeliveryZoneDto) {
    const data = await this.toggleDeliveryZoneUseCase.execute(uuid, dto)
    return { data }
  }

  @Delete('delivery-zones/:uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  async deleteDeliveryZone(@Param('uuid') uuid: string) {
    const data = await this.deleteDeliveryZoneUseCase.execute(uuid)
    return { data }
  }
}
