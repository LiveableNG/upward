import { Controller, Post, Get, Patch, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CreatePropertyUseCase } from '../../../application/pm/use-cases/create-property.use-case';
import { UpdatePropertyUseCase } from '../../../application/pm/use-cases/update-property.use-case';
import { DeletePropertyUseCase } from '../../../application/pm/use-cases/delete-property.use-case';
import { GetPmPropertiesUseCase } from '../../../application/pm/use-cases/get-pm-properties.use-case';
import { GetPmPropertyUseCase } from '../../../application/pm/use-cases/get-pm-property.use-case';
import { BulkCreateUnitsUseCase } from '../../../application/pm/use-cases/bulk-create-units.use-case';
import { GetPmUnitsUseCase } from '../../../application/pm/use-cases/get-pm-units.use-case';
import { GetUnitUseCase } from '../../../application/pm/use-cases/get-unit.use-case';
import { UpdateUnitUseCase } from '../../../application/pm/use-cases/update-unit.use-case';
import { DeleteUnitUseCase } from '../../../application/pm/use-cases/delete-unit.use-case';
import { GetUnitPaymentsUseCase } from '../../../application/pm/use-cases/get-unit-payments.use-case';
import { AddUnitPaymentUseCase } from '../../../application/pm/use-cases/add-unit-payment.use-case';
import { GetPropertyImageUploadUrlUseCase } from '../../../application/pm/use-cases/get-property-image-upload-url.use-case';
import { SyncUnitToUpwardUseCase } from '../../../application/pm/use-cases/units/sync-unit.use-case';
import { CreatePmPaymentRequestUseCase, CreatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/create-pm-payment-request.use-case';
import { GetPmPaymentRequestsUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-requests.use-case';
import { BulkFullImportUseCase } from '../../../application/pm/use-cases/bulk-full-import.use-case';
import { BulkInviteTenantsUseCase } from '../../../application/pm/use-cases/tenants/bulk-invite-tenants.use-case';
import { SendLandlordReportUseCase } from '../../../application/pm/use-cases/send-landlord-report.use-case';
import { GetLandlordReportsUseCase } from '../../../application/pm/use-cases/get-landlord-reports.use-case';
import { GetLandlordReportUseCase } from '../../../application/pm/use-cases/get-landlord-report.use-case';
import { PmBulkRentReminderUseCase } from '../../../application/pm/use-cases/pm-bulk-rent-reminder.use-case';
import { CreatePropertyDto, UpdatePropertyDto, BulkCreateUnitsDto, BulkFullImportDto } from '../../../application/pm/dtos/property.dto';
import { SendLandlordReportDto } from '../../../application/pm/dtos/landlord.dto';
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
    private readonly getPmPropertyUseCase: GetPmPropertyUseCase,
    private readonly bulkCreateUnitsUseCase: BulkCreateUnitsUseCase,
    private readonly getPmUnitsUseCase: GetPmUnitsUseCase,
    private readonly getUnitUseCase: GetUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly deleteUnitUseCase: DeleteUnitUseCase,
    private readonly getUnitPaymentsUseCase: GetUnitPaymentsUseCase,
    private readonly addUnitPaymentUseCase: AddUnitPaymentUseCase,
    private readonly getPropertyImageUploadUrlUseCase: GetPropertyImageUploadUrlUseCase,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
    private readonly createPmPaymentRequestUseCase: CreatePmPaymentRequestUseCase,
    private readonly getPmPaymentRequestsUseCase: GetPmPaymentRequestsUseCase,
    private readonly bulkFullImportUseCase: BulkFullImportUseCase,
    private readonly bulkInviteTenantsUseCase: BulkInviteTenantsUseCase,
    private readonly sendLandlordReportUseCase: SendLandlordReportUseCase,
    private readonly getLandlordReportsUseCase: GetLandlordReportsUseCase,
    private readonly getLandlordReportUseCase: GetLandlordReportUseCase,
    private readonly pmBulkRentReminderUseCase: PmBulkRentReminderUseCase,
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

  @Get('properties/:propertyUuid')
  async getProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string) {
    const pmId = await this.getPmId(req);
    return this.getPmPropertyUseCase.execute(pmId, propertyUuid);
  }

  @Post('units/bulk')
  async bulkCreateUnits(@Req() req: any, @Body() dto: BulkCreateUnitsDto) {
    const pmId = await this.getPmId(req);
    return this.bulkCreateUnitsUseCase.execute(pmId, dto);
  }

  @Post('import/bulk')
  async bulkFullImport(@Req() req: any, @Body() dto: BulkFullImportDto) {
    const pmId = await this.getPmId(req);
    return this.bulkFullImportUseCase.execute(pmId, dto);
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

  @Post('payment-requests')
  async createPaymentRequest(@Req() req: any, @Body() dto: CreatePmPaymentRequestDto) {
    const pmId = await this.getPmId(req);
    return this.createPmPaymentRequestUseCase.execute(pmId, dto);
  }

  @Get('payment-requests')
  async getPaymentRequests(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPmPaymentRequestsUseCase.execute(pmId);
  }

  @Post('landlords/send-report')
  async sendLandlordReport(@Req() req: any, @Body() dto: SendLandlordReportDto) {
    const pmId = await this.getPmId(req);
    return this.sendLandlordReportUseCase.execute(pmId, dto);
  }

  @Get('landlords/:landlordEmail/reports')
  async getLandlordReports(@Req() req: any, @Param('landlordEmail') landlordEmail: string) {
    const pmId = await this.getPmId(req);
    return this.getLandlordReportsUseCase.execute(pmId, landlordEmail);
  }

  @Get('landlords/reports/:uuid')
  async getLandlordReport(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.getLandlordReportUseCase.execute(pmId, uuid);
  }

  @Post('landlords/:landlordEmail/bulk-reminders')
  async sendBulkReminders(@Req() req: any, @Param('landlordEmail') landlordEmail: string) {
    const pmId = await this.getPmId(req);
    return this.pmBulkRentReminderUseCase.execute(pmId, landlordEmail);
  }
}
