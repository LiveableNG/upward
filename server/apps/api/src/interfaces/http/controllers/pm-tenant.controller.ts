import { Controller, Post, Get, Patch, Body, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { GetPmTenantsUseCase } from '../../../application/pm/use-cases/tenants/get-pm-tenants.use-case';
import { InviteTenantUseCase } from '../../../application/pm/use-cases/tenants/invite-tenant.use-case';
import { CreateTenantUseCase, CreateTenantDto } from '../../../application/pm/use-cases/tenants/create-tenant.use-case';
import { LookupUserUseCase } from '../../../application/pm/use-cases/tenants/lookup-user.use-case';
import { GetTenantUseCase } from '../../../application/pm/use-cases/tenants/get-tenant.use-case';
import { AssignTenantToUnitUseCase } from '../../../application/pm/use-cases/tenants/assign-tenant-to-unit.use-case';
import { UpdateTenantUseCase } from '../../../application/pm/use-cases/tenants/update-tenant.use-case';
import { BulkCreateTenantRecordsUseCase } from '../../../application/pm/use-cases/bulk-create-tenant-records.use-case';
import { BulkInviteTenantsUseCase, BulkInviteDto } from '../../../application/pm/use-cases/tenants/bulk-invite-tenants.use-case';
import { GetPendingJoinRequestsUseCase } from '../../../application/pm/use-cases/tenants/get-pending-join-requests.use-case';
import { DismissJoinRequestUseCase } from '../../../application/pm/use-cases/tenants/dismiss-join-request.use-case';
import { ResolveDuplicateJoinRequestUseCase } from '../../../application/pm/use-cases/tenants/resolve-duplicate-join-request.use-case';

@Controller('pm/tenants')
@UseGuards(JwtAuthGuard)
export class PmTenantController {
  constructor(
    private readonly getPmTenantsUseCase: GetPmTenantsUseCase,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly lookupUserUseCase: LookupUserUseCase,
    private readonly getTenantUseCase: GetTenantUseCase,
    private readonly assignTenantToUnitUseCase: AssignTenantToUnitUseCase,
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    private readonly bulkCreateTenantRecordsUseCase: BulkCreateTenantRecordsUseCase,
    private readonly bulkInviteTenantsUseCase: BulkInviteTenantsUseCase,
    private readonly getPendingJoinRequestsUseCase: GetPendingJoinRequestsUseCase,
    private readonly dismissJoinRequestUseCase: DismissJoinRequestUseCase,
    private readonly resolveDuplicateJoinRequestUseCase: ResolveDuplicateJoinRequestUseCase,
  ) {}

  @Get('lookup-user')
  async lookupUser(@Query('email') email?: string, @Query('phone') phone?: string) {
    return this.lookupUserUseCase.execute({ email, phone });
  }

  @Get()
  async getTenants(@CurrentPmActor() actor: PmActorContext) {
    return this.getPmTenantsUseCase.execute(actor.ownerPmId, actor);
  }

  @Get('join-requests')
  async getJoinRequests(@CurrentPmActor() actor: PmActorContext) {
    return this.getPendingJoinRequestsUseCase.execute(actor.ownerPmId, actor);
  }

  @Post('join-requests/:uuid/dismiss')
  async dismissJoinRequest(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.dismissJoinRequestUseCase.execute(actor.ownerPmId, uuid);
  }

  @Post('join-requests/:uuid/resolve-duplicate')
  async resolveDuplicateJoinRequest(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.resolveDuplicateJoinRequestUseCase.execute(actor.ownerPmId, uuid);
  }

  @Get(':uuid')
  async getTenant(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.getTenantUseCase.execute(actor.ownerPmId, uuid, actor);
  }

  @Post()
  async createTenant(@CurrentPmActor() actor: PmActorContext, @Body() dto: CreateTenantDto) {
    return this.createTenantUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Post(':uuid/invite')
  async inviteTenant(
    @CurrentPmActor() actor: PmActorContext,
    @Param('uuid') uuid: string,
    @Body() body: { deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP' },
  ) {
    return this.inviteTenantUseCase.execute(actor.ownerPmId, uuid, body?.deliveryChannel, actor);
  }

  @Post(':uuid/assign')
  async assignTenant(
    @CurrentPmActor() actor: PmActorContext,
    @Param('uuid') tenantUuid: string,
    @Body() body: {
      unitUuid: string;
      rentAmountPaid?: number;
      rentAmount?: number;
      rentType?: string;
      rentStartDate?: string;
      rentDueDate?: string;
      isFullyPaid?: boolean;
    },
  ) {
    return this.assignTenantToUnitUseCase.execute(
      actor.ownerPmId,
      body.unitUuid,
      tenantUuid,
      body.rentAmountPaid,
      body.rentAmount,
      body.rentType,
      body.rentStartDate ? new Date(body.rentStartDate) : undefined,
      body.rentDueDate ? new Date(body.rentDueDate) : undefined,
      body.isFullyPaid,
      actor,
    );
  }

  @Post(':uuid/unassign')
  async unassignTenant(
    @CurrentPmActor() actor: PmActorContext,
    @Param('uuid') tenantUuid: string,
    @Body() body: { unitUuid: string },
  ) {
    return this.assignTenantToUnitUseCase.execute(
      actor.ownerPmId,
      body.unitUuid,
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      actor,
    );
  }

  @Patch(':uuid')
  async updateTenant(
    @CurrentPmActor() actor: PmActorContext,
    @Param('uuid') uuid: string,
    @Body() dto: any,
  ) {
    return this.updateTenantUseCase.execute(actor.ownerPmId, uuid, dto, actor);
  }

  @Post('records/bulk')
  async bulkCreateRecords(@CurrentPmActor() actor: PmActorContext, @Body() body: any) {
    return this.bulkCreateTenantRecordsUseCase.execute({
      pmId: actor.ownerPmId,
      propertyAddress: body.propertyAddress,
      unitUuid: body.unitUuid,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      records: body.records,
    }, actor);
  }

  @Post('bulk-invite')
  async bulkInvite(@CurrentPmActor() actor: PmActorContext, @Body() dto: BulkInviteDto) {
    return this.bulkInviteTenantsUseCase.execute(actor.ownerPmId, dto, actor);
  }
}

