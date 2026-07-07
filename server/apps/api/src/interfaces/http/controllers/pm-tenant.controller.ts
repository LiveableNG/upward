import { Controller, Post, Get, Patch, Body, UseGuards, Req, Param, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { GetPmTenantsUseCase } from '../../../application/pm/use-cases/tenants/get-pm-tenants.use-case';
import { InviteTenantUseCase } from '../../../application/pm/use-cases/tenants/invite-tenant.use-case';
import { CreateTenantUseCase, CreateTenantDto } from '../../../application/pm/use-cases/tenants/create-tenant.use-case';
import { GetTenantUseCase } from '../../../application/pm/use-cases/tenants/get-tenant.use-case';
import { AssignTenantToUnitUseCase } from '../../../application/pm/use-cases/tenants/assign-tenant-to-unit.use-case';
import { UpdateTenantUseCase } from '../../../application/pm/use-cases/tenants/update-tenant.use-case';
import { BulkCreateTenantRecordsUseCase } from '../../../application/pm/use-cases/bulk-create-tenant-records.use-case';
import { BulkInviteTenantsUseCase, BulkInviteDto } from '../../../application/pm/use-cases/tenants/bulk-invite-tenants.use-case';
import { GetPendingJoinRequestsUseCase } from '../../../application/pm/use-cases/tenants/get-pending-join-requests.use-case';
import { DismissJoinRequestUseCase } from '../../../application/pm/use-cases/tenants/dismiss-join-request.use-case';
import { ResolveDuplicateJoinRequestUseCase } from '../../../application/pm/use-cases/tenants/resolve-duplicate-join-request.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/tenants')
@UseGuards(JwtAuthGuard)
export class PmTenantController {
  constructor(
    private readonly getPmTenantsUseCase: GetPmTenantsUseCase,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly getTenantUseCase: GetTenantUseCase,
    private readonly assignTenantToUnitUseCase: AssignTenantToUnitUseCase,
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    private readonly bulkCreateTenantRecordsUseCase: BulkCreateTenantRecordsUseCase,
    private readonly bulkInviteTenantsUseCase: BulkInviteTenantsUseCase,
    private readonly getPendingJoinRequestsUseCase: GetPendingJoinRequestsUseCase,
    private readonly dismissJoinRequestUseCase: DismissJoinRequestUseCase,
    private readonly resolveDuplicateJoinRequestUseCase: ResolveDuplicateJoinRequestUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Get()
  async getTenants(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPmTenantsUseCase.execute(pmId);
  }

  @Get('join-requests')
  async getJoinRequests(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPendingJoinRequestsUseCase.execute(pmId);
  }

  @Post('join-requests/:uuid/dismiss')
  async dismissJoinRequest(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.dismissJoinRequestUseCase.execute(pmId, uuid);
  }

  @Post('join-requests/:uuid/resolve-duplicate')
  async resolveDuplicateJoinRequest(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.resolveDuplicateJoinRequestUseCase.execute(pmId, uuid);
  }

  @Get(':uuid')
  async getTenant(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.getTenantUseCase.execute(pmId, uuid);
  }

  @Post()
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    const pmId = await this.getPmId(req);
    return this.createTenantUseCase.execute(pmId, dto);
  }

  @Post(':uuid/invite')
  async inviteTenant(@Req() req: any, @Param('uuid') uuid: string, @Body() body: { deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP' }) {
    const pmId = await this.getPmId(req);
    return this.inviteTenantUseCase.execute(pmId, uuid, body?.deliveryChannel);
  }

  @Post(':uuid/assign')
  async assignTenant(
    @Req() req: any, 
    @Param('uuid') tenantUuid: string, 
    @Body() body: { 
      unitUuid: string; 
      rentAmountPaid?: number;
      rentAmount?: number;
      rentType?: string;
      rentStartDate?: string;
      rentDueDate?: string;
    }
  ) {
    const pmId = await this.getPmId(req);
    return this.assignTenantToUnitUseCase.execute(
      pmId, 
      body.unitUuid, 
      tenantUuid, 
      body.rentAmountPaid,
      body.rentAmount,
      body.rentType,
      body.rentStartDate ? new Date(body.rentStartDate) : undefined,
      body.rentDueDate ? new Date(body.rentDueDate) : undefined
    );
  }

  @Post(':uuid/unassign')
  async unassignTenant(@Req() req: any, @Param('uuid') tenantUuid: string, @Body() body: { unitUuid: string }) {
    const pmId = await this.getPmId(req);
    return this.assignTenantToUnitUseCase.execute(pmId, body.unitUuid, null);
  }

  @Patch(':uuid')
  async updateTenant(@Req() req: any, @Param('uuid') uuid: string, @Body() dto: any) {
    const pmId = await this.getPmId(req);
    return this.updateTenantUseCase.execute(pmId, uuid, dto);
  }

  @Post('records/bulk')
  async bulkCreateRecords(@Req() req: any, @Body() body: any) {
    const pmId = await this.getPmId(req);
    return this.bulkCreateTenantRecordsUseCase.execute({
      pmId,
      propertyAddress: body.propertyAddress,
      unitUuid: body.unitUuid,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      records: body.records
    });
  }

  @Post('bulk-invite')
  async bulkInvite(@Req() req: any, @Body() dto: BulkInviteDto) {
    const pmId = await this.getPmId(req);
    return this.bulkInviteTenantsUseCase.execute(pmId, dto);
  }
}
