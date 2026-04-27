import { Controller, Post, Get, Patch, Body, UseGuards, Req, Param, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { GetPmTenantsUseCase } from '../../../application/pm/use-cases/tenants/get-pm-tenants.use-case';
import { InviteTenantUseCase } from '../../../application/pm/use-cases/tenants/invite-tenant.use-case';
import { CreateTenantUseCase, CreateTenantDto } from '../../../application/pm/use-cases/tenants/create-tenant.use-case';
import { GetTenantUseCase } from '../../../application/pm/use-cases/tenants/get-tenant.use-case';
import { AssignTenantToUnitUseCase } from '../../../application/pm/use-cases/tenants/assign-tenant-to-unit.use-case';
import { UpdateTenantUseCase } from '../../../application/pm/use-cases/tenants/update-tenant.use-case';
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
  async inviteTenant(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.inviteTenantUseCase.execute(pmId, uuid);
  }

  @Post(':uuid/assign')
  async assignTenant(@Req() req: any, @Param('uuid') tenantUuid: string, @Body() body: { unitUuid: string }) {
    const pmId = await this.getPmId(req);
    return this.assignTenantToUnitUseCase.execute(pmId, body.unitUuid, tenantUuid);
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
}
