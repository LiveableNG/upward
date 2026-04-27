import { Controller, Post, Get, Patch, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CreatePropertyUseCase } from '../../../application/pm/use-cases/create-property.use-case';
import { UpdatePropertyUseCase } from '../../../application/pm/use-cases/update-property.use-case';
import { DeletePropertyUseCase } from '../../../application/pm/use-cases/delete-property.use-case';
import { GetPmPropertiesUseCase } from '../../../application/pm/use-cases/get-pm-properties.use-case';
import { BulkCreateUnitsUseCase } from '../../../application/pm/use-cases/bulk-create-units.use-case';
import { GetPmUnitsUseCase } from '../../../application/pm/use-cases/get-pm-units.use-case';
import { GetUnitUseCase } from '../../../application/pm/use-cases/get-unit.use-case';
import { UpdateUnitUseCase } from '../../../application/pm/use-cases/update-unit.use-case';
import { DeleteUnitUseCase } from '../../../application/pm/use-cases/delete-unit.use-case';
import { GetUnitPaymentsUseCase } from '../../../application/pm/use-cases/get-unit-payments.use-case';
import { AddUnitPaymentUseCase } from '../../../application/pm/use-cases/add-unit-payment.use-case';
import { GetPropertyImageUploadUrlUseCase } from '../../../application/pm/use-cases/get-property-image-upload-url.use-case';
import { SyncUnitToUpwardUseCase } from '../../../application/pm/use-cases/units/sync-unit.use-case';
import { CreatePropertyDto, UpdatePropertyDto, BulkCreateUnitsDto } from '../../../application/pm/dtos/property.dto';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { Inject, UnauthorizedException, Delete } from '@nestjs/common';

@Controller('pm')
@UseGuards(JwtAuthGuard)
export class PmPropertyController {
  constructor(
    private readonly createPropertyUseCase: CreatePropertyUseCase,
    private readonly updatePropertyUseCase: UpdatePropertyUseCase,
    private readonly deletePropertyUseCase: DeletePropertyUseCase,
    private readonly getPmPropertiesUseCase: GetPmPropertiesUseCase,
    private readonly bulkCreateUnitsUseCase: BulkCreateUnitsUseCase,
    private readonly getPmUnitsUseCase: GetPmUnitsUseCase,
    private readonly getUnitUseCase: GetUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly deleteUnitUseCase: DeleteUnitUseCase,
    private readonly getUnitPaymentsUseCase: GetUnitPaymentsUseCase,
    private readonly addUnitPaymentUseCase: AddUnitPaymentUseCase,
    private readonly getPropertyImageUploadUrlUseCase: GetPropertyImageUploadUrlUseCase,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Post('properties')
  async createProperty(@Req() req: any, @Body() dto: CreatePropertyDto) {
    const pmId = await this.getPmId(req); 
    return this.createPropertyUseCase.execute(pmId, dto);
  }

  @Patch('properties/:propertyUuid')
  async updateProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string, @Body() dto: UpdatePropertyDto) {
    const pmId = await this.getPmId(req);
    return this.updatePropertyUseCase.execute(pmId, propertyUuid, dto);
  }

  @Delete('properties/:propertyUuid')
  async deleteProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string) {
    const pmId = await this.getPmId(req);
    return this.deletePropertyUseCase.execute(pmId, propertyUuid);
  }

  @Get('properties')
  async getProperties(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPmPropertiesUseCase.execute(pmId);
  }

  @Post('units/bulk')
  async bulkCreateUnits(@Req() req: any, @Body() dto: BulkCreateUnitsDto) {
    const pmId = await this.getPmId(req);
    return this.bulkCreateUnitsUseCase.execute(pmId, dto);
  }

  @Get('units')
  async getUnits(@Req() req: any, @Query('propertyUuid') propertyUuid?: string) {
    const pmId = await this.getPmId(req);
    return this.getPmUnitsUseCase.execute(pmId, propertyUuid);
  }

  @Get('units/:unitUuid')
  async getUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getPmId(req);
    return this.getUnitUseCase.execute(pmId, unitUuid);
  }

  @Patch('units/:unitUuid')
  async updateUnit(@Req() req: any, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    const pmId = await this.getPmId(req);
    return this.updateUnitUseCase.execute(pmId, unitUuid, dto);
  }

  @Delete('units/:unitUuid')
  async deleteUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getPmId(req);
    return this.deleteUnitUseCase.execute(pmId, unitUuid);
  }

  @Get('units/:unitUuid/payments')
  async getUnitPayments(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getPmId(req);
    return this.getUnitPaymentsUseCase.execute(pmId, unitUuid);
  }

  @Post('units/:unitUuid/payments')
  async addUnitPayment(@Req() req: any, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    const pmId = await this.getPmId(req);
    return this.addUnitPaymentUseCase.execute(pmId, unitUuid, dto);
  }

  @Post('units/:unitUuid/sync-to-upward')
  async syncToUpward(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getPmId(req);
    return this.syncUnitToUpwardUseCase.execute(unitUuid, pmId);
  }

  @Post('properties/image-upload-url')
  async getImageUploadUrl(@Req() req: any, @Body() body: { contentType: string; filename: string }) {
    const pmId = await this.getPmId(req);
    return this.getPropertyImageUploadUrlUseCase.execute(pmId, body.contentType, body.filename);
  }
}
