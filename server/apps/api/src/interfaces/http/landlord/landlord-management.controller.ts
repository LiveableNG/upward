import { Controller, Post, Get, Patch, Body, UseGuards, Req, Param, Inject, UnauthorizedException, NotFoundException, BadRequestException, Delete, Query, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { CreatePmPaymentRequestUseCase, CreatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/create-pm-payment-request.use-case';
import { UpdatePmPaymentRequestUseCase, UpdatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/update-pm-payment-request.use-case';
import { GetPmPaymentRequestsUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-requests.use-case';
import { CreatePropertyUseCase } from '../../../application/pm/use-cases/create-property.use-case';
import { BulkCreateUnitsUseCase } from '../../../application/pm/use-cases/bulk-create-units.use-case';
import { GetPmPropertiesUseCase } from '../../../application/pm/use-cases/get-pm-properties.use-case';
import { GetPmUnitsUseCase } from '../../../application/pm/use-cases/get-pm-units.use-case';
import { SyncUnitToUpwardUseCase } from '../../../application/pm/use-cases/units/sync-unit.use-case';
import { UpdatePmBankInfoUseCase } from '../../../application/use-cases/pm/update-pm-bank-info.use-case';
import { VerifyAccountUseCase, GetBanksUseCase, GetPmPayoutsUseCase, GetPayoutBreakdownUseCase } from '../../../application/use-cases/payments/payment.use-cases';

// Missing Use Case Imports
import { GetPendingCredibilityRequestsUseCase } from '../../../application/pm/use-cases/get-pending-credibility-requests.use-case';
import { MarkCredibilityRequestDoneUseCase } from '../../../application/pm/use-cases/mark-credibility-request-done.use-case';
import { RejectCredibilityRequestUseCase } from '../../../application/use-cases/external/reject-credibility-request.use-case';
import { GetPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-request.use-case';
import { ResendPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/resend-pm-payment-request.use-case';
import { CancelPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/cancel-pm-payment-request.use-case';
import { GetPmUnresolvedTransactionsUseCase } from '../../../application/use-cases/payments/payment.use-cases';
import { ResolvePendingRefundUseCase, RefundResolutionAction } from '../../../application/pm/use-cases/payments/resolve-refund.use-case';
import { UpdatePropertyUseCase } from '../../../application/pm/use-cases/update-property.use-case';
import { DeletePropertyUseCase } from '../../../application/pm/use-cases/delete-property.use-case';
import { GetPmPropertyUseCase } from '../../../application/pm/use-cases/get-pm-property.use-case';

import { GetUnitUseCase } from '../../../application/pm/use-cases/get-unit.use-case';
import { UpdateUnitUseCase } from '../../../application/pm/use-cases/update-unit.use-case';
import { DeleteUnitUseCase } from '../../../application/pm/use-cases/delete-unit.use-case';

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

import { GetPmDocumentsUseCase } from '../../../application/pm/use-cases/documents/get-pm-documents.use-case';
import { SaveDocumentTemplateUseCase, SaveDocumentTemplateDto } from '../../../application/pm/use-cases/documents/save-document-template.use-case';
import { SendDocumentUseCase, SendDocumentDto } from '../../../application/pm/use-cases/documents/send-document.use-case';
import { GenerateDocumentPdfUseCase } from '../../../application/pm/use-cases/documents/generate-document-pdf.use-case';

import { GetUnitPaymentsUseCase } from '../../../application/pm/use-cases/get-unit-payments.use-case';
import { AddUnitPaymentUseCase } from '../../../application/pm/use-cases/add-unit-payment.use-case';
import { UpdateRentPaymentUseCase } from '../../../application/pm/use-cases/update-rent-payment.use-case';
import { DeleteRentPaymentUseCase } from '../../../application/pm/use-cases/delete-rent-payment.use-case';
import { BulkAddRentHistoryUseCase } from '../../../application/pm/use-cases/bulk-add-rent-history.use-case';

import { BulkFullImportUseCase } from '../../../application/pm/use-cases/bulk-full-import.use-case';

@Controller('landlords/management')
@UseGuards(JwtAuthGuard)
export class LandlordManagementController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
    private readonly createPropertyUseCase: CreatePropertyUseCase,
    private readonly updatePropertyUseCase: UpdatePropertyUseCase,
    private readonly deletePropertyUseCase: DeletePropertyUseCase,
    private readonly getPmPropertyUseCase: GetPmPropertyUseCase,
    private readonly bulkCreateUnitsUseCase: BulkCreateUnitsUseCase,
    private readonly createPaymentRequestUseCase: CreatePmPaymentRequestUseCase,
    private readonly updatePaymentRequestUseCase: UpdatePmPaymentRequestUseCase,
    private readonly getPaymentRequestsUseCase: GetPmPaymentRequestsUseCase,
    private readonly getPropertiesUseCase: GetPmPropertiesUseCase,
    private readonly getUnitsUseCase: GetPmUnitsUseCase,
    private readonly getUnitUseCase: GetUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly deleteUnitUseCase: DeleteUnitUseCase,
    private readonly syncUnitUseCase: SyncUnitToUpwardUseCase,
    private readonly updateBankInfoUseCase: UpdatePmBankInfoUseCase,
    private readonly verifyAccountUseCase: VerifyAccountUseCase,
    private readonly getBanksUseCase: GetBanksUseCase,
    private readonly getPmPayoutsUseCase: GetPmPayoutsUseCase,
    private readonly getPayoutBreakdownUseCase: GetPayoutBreakdownUseCase,

    // Proxy Injections
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

    private readonly getDocumentsUseCase: GetPmDocumentsUseCase,
    private readonly saveTemplateUseCase: SaveDocumentTemplateUseCase,
    private readonly sendDocumentUseCase: SendDocumentUseCase,
    private readonly generatePdfUseCase: GenerateDocumentPdfUseCase,

    private readonly getUnitPaymentsUseCase: GetUnitPaymentsUseCase,
    private readonly addUnitPaymentUseCase: AddUnitPaymentUseCase,
    private readonly updateRentPaymentUseCase: UpdateRentPaymentUseCase,
    private readonly deleteRentPaymentUseCase: DeleteRentPaymentUseCase,
    private readonly bulkAddRentHistoryUseCase: BulkAddRentHistoryUseCase,

    private readonly getPendingCredibilityRequestsUseCase: GetPendingCredibilityRequestsUseCase,
    private readonly markCredibilityRequestDoneUseCase: MarkCredibilityRequestDoneUseCase,
    private readonly rejectCredibilityRequestUseCase: RejectCredibilityRequestUseCase,

    private readonly bulkFullImportUseCase: BulkFullImportUseCase,

    private readonly getPmPaymentRequestUseCase: GetPmPaymentRequestUseCase,
    private readonly resendPmPaymentRequestUseCase: ResendPmPaymentRequestUseCase,
    private readonly cancelPmPaymentRequestUseCase: CancelPmPaymentRequestUseCase,
    private readonly getPmUnresolvedTransactionsUseCase: GetPmUnresolvedTransactionsUseCase,
    private readonly resolvePendingRefundUseCase: ResolvePendingRefundUseCase,
  ) {}

  /**
   * Helper to ensure the Landlord has a PM profile and return the ID.
   * This is the "Shadow PM" bridge.
   */
  private async getElevatedPmId(req: any): Promise<number> {
    const email = req.user?.email;
    if (!email) throw new UnauthorizedException('Invalid landlord context');

    // 1. Find or Create a PM profile for this Landlord email
    let pm = await this.pmRepository.findByEmail(email);
    
    if (!pm) {
      // Auto-elevate landlord to a managing PM profile if they don't have one
      const landlord = await this.prisma.upward_pm_landlord.findUnique({
        where: { emailHash: this.hashEmail(email) }
      });
      
      if (!landlord) throw new UnauthorizedException('Landlord record not found');

      const newPm = await this.prisma.upward_property_manager.create({
        data: {
          email: email,
          emailHash: this.hashEmail(email),
          passwordHash: landlord.passwordHash, // Sync password
          firstName: landlord.firstName || 'Landlord',
          lastName: landlord.lastName || 'User',
          businessName: `${landlord.firstName}'s Portfolio`,
          pmType: 'INDIVIDUAL_LANDLORD'
        }
      });
      return newPm.id;
    }

    return pm.id!;
  }

  private hashEmail(email: string): string {
    return require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  // --- Properties ---

  @Post('properties')
  async createProperty(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.createPropertyUseCase.execute(pmId, dto);
  }

  @Get('properties')
  async getProperties(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPropertiesUseCase.execute(pmId);
  }

  @Get('properties/:propertyUuid')
  async getProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPmPropertyUseCase.execute(pmId, propertyUuid);
  }

  @Patch('properties/:propertyUuid')
  async updateProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.updatePropertyUseCase.execute(pmId, propertyUuid, dto);
  }

  @Delete('properties/:propertyUuid')
  async deleteProperty(@Req() req: any, @Param('propertyUuid') propertyUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.deletePropertyUseCase.execute(pmId, propertyUuid);
  }

  // --- Units ---

  @Post('units/bulk')
  async createUnits(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.bulkCreateUnitsUseCase.execute(pmId, dto);
  }

  @Get('units')
  async getUnits(@Req() req: any, @Query('propertyUuid') propertyUuid?: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getUnitsUseCase.execute(pmId, propertyUuid);
  }

  @Get('units/:unitUuid')
  async getUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getUnitUseCase.execute(pmId, unitUuid);
  }

  @Patch('units/:unitUuid')
  async updateUnit(@Req() req: any, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.updateUnitUseCase.execute(pmId, unitUuid, dto);
  }

  @Delete('units/:unitUuid')
  async deleteUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.deleteUnitUseCase.execute(pmId, unitUuid);
  }

  @Post('units/:unitUuid/sync')
  async syncUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.syncUnitUseCase.execute(unitUuid, pmId);
  }

  // --- Tenants ---

  @Get('tenants')
  async getTenants(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPmTenantsUseCase.execute(pmId);
  }

  @Get('tenants/join-requests')
  async getJoinRequests(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPendingJoinRequestsUseCase.execute(pmId);
  }

  @Post('tenants/join-requests/:uuid/dismiss')
  async dismissJoinRequest(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.dismissJoinRequestUseCase.execute(pmId, uuid);
  }

  @Get('tenants/:uuid')
  async getTenant(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getTenantUseCase.execute(pmId, uuid);
  }

  @Post('tenants')
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.createTenantUseCase.execute(pmId, dto);
  }

  @Post('tenants/:uuid/invite')
  async inviteTenant(@Req() req: any, @Param('uuid') uuid: string, @Body() body: { deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP' }) {
    const pmId = await this.getElevatedPmId(req);
    return this.inviteTenantUseCase.execute(pmId, uuid, body?.deliveryChannel);
  }

  @Post('tenants/:uuid/assign')
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
    const pmId = await this.getElevatedPmId(req);
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

  @Post('tenants/:uuid/unassign')
  async unassignTenant(@Req() req: any, @Param('uuid') tenantUuid: string, @Body() body: { unitUuid: string }) {
    const pmId = await this.getElevatedPmId(req);
    return this.assignTenantToUnitUseCase.execute(pmId, body.unitUuid, null);
  }

  @Patch('tenants/:uuid')
  async updateTenant(@Req() req: any, @Param('uuid') uuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.updateTenantUseCase.execute(pmId, uuid, dto);
  }

  @Post('tenants/records/bulk')
  async bulkCreateRecords(@Req() req: any, @Body() body: any) {
    const pmId = await this.getElevatedPmId(req);
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

  @Post('tenants/bulk-invite')
  async bulkInvite(@Req() req: any, @Body() dto: BulkInviteDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.bulkInviteTenantsUseCase.execute(pmId, dto);
  }

  // --- Documents ---

  @Get('documents')
  async getDocuments(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getDocumentsUseCase.execute(pmId);
  }

  @Post('documents/templates')
  async saveTemplate(@Req() req: any, @Body() data: SaveDocumentTemplateDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.saveTemplateUseCase.execute(pmId, data);
  }

  @Post('documents/send')
  async sendDocument(@Req() req: any, @Body() data: SendDocumentDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.sendDocumentUseCase.execute(pmId, data);
  }

  @Post('documents/generate-pdf')
  async generatePdf(@Req() req: any, @Body() data: { content: string; tenantUuid?: string; unitUuid?: string; recipientName?: string }, @Res() res: any) {
    const pmId = await this.getElevatedPmId(req);
    const buffer = await this.generatePdfUseCase.execute({
      content: data.content,
      pmId,
      tenantUuid: data.tenantUuid,
      unitUuid: data.unitUuid,
      recipientName: data.recipientName,
    });
    
    if (typeof res.set === 'function') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=document.pdf',
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', 'attachment; filename=document.pdf');
      res.header('Content-Length', buffer.length);
      res.send(buffer);
    }
  }

  // --- Rent Payments & Offline History ---

  @Get('units/:unitUuid/payments')
  async getUnitPayments(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getUnitPaymentsUseCase.execute(pmId, unitUuid);
  }

  @Post('units/:unitUuid/payments')
  async addUnitPayment(@Req() req: any, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.addUnitPaymentUseCase.execute(pmId, unitUuid, dto);
  }

  @Patch('units/:unitUuid/payments/:paymentUuid')
  async updateUnitPayment(@Req() req: any, @Param('paymentUuid') paymentUuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.updateRentPaymentUseCase.execute(pmId, paymentUuid, dto);
  }

  @Delete('units/:unitUuid/payments/:paymentUuid')
  async deleteUnitPayment(@Req() req: any, @Param('paymentUuid') paymentUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.deleteRentPaymentUseCase.execute(pmId, paymentUuid);
  }

  @Post('units/:unitUuid/payments/bulk')
  async bulkAddRentHistory(@Req() req: any, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.bulkAddRentHistoryUseCase.execute(pmId, { ...dto, unitUuid });
  }

  // --- Bulk Imports ---

  @Post('import/bulk')
  async bulkFullImport(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.bulkFullImportUseCase.execute(pmId, dto);
  }

  // --- Rent Requests / Invoicing ---

  @Post('payment-requests')
  async createPaymentRequest(@Req() req: any, @Body() dto: CreatePmPaymentRequestDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.createPaymentRequestUseCase.execute(pmId, dto);
  }

  @Patch('payment-requests/:uuid')
  async updatePaymentRequest(@Req() req: any, @Param('uuid') uuid: string, @Body() dto: UpdatePmPaymentRequestDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.updatePaymentRequestUseCase.execute(pmId, uuid, dto);
  }

  @Get('payment-requests')
  async getPaymentRequests(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPaymentRequestsUseCase.execute(pmId);
  }

  @Get('payment-requests/:uuid')
  async getPaymentRequest(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPmPaymentRequestUseCase.execute(pmId, uuid);
  }

  @Post('payment-requests/:uuid/resend')
  async resendPaymentRequest(
    @Req() req: any, 
    @Param('uuid') uuid: string,
    @Body() body: { email?: string; channels?: ('EMAIL' | 'WHATSAPP' | 'SMS')[] }
  ) {
    const pmId = await this.getElevatedPmId(req);
    return this.resendPmPaymentRequestUseCase.execute(pmId, uuid, body.email, body.channels);
  }

  @Delete('payment-requests/:uuid')
  async cancelPaymentRequest(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.cancelPmPaymentRequestUseCase.execute(pmId, uuid);
  }

  @Get('payments/unresolved')
  async getUnresolvedTransactions(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPmUnresolvedTransactionsUseCase.execute(pmId);
  }

  @Post('payments/unresolved/:uuid/resolve')
  async resolveTransaction(
    @Req() req: any, 
    @Param('uuid') uuid: string,
    @Body() body: { action: RefundResolutionAction }
  ) {
    const pmId = await this.getElevatedPmId(req);
    return this.resolvePendingRefundUseCase.execute(pmId, uuid, body.action);
  }

  // --- Settlement Settings ---

  @Patch('profile/bank-info')
  async updateBankInfo(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: pmId } });
    if (!pm) throw new NotFoundException('PM record not found');
    return this.updateBankInfoUseCase.execute(pm.uuid, dto);
  }

  @Post('profile/verify-bank')
  async verifyBank(@Req() req: any, @Body() dto: { accountNumber: string, bankCode: string }) {
    await this.getElevatedPmId(req);
    return this.verifyAccountUseCase.execute(dto.accountNumber, dto.bankCode);
  }

  @Get('profile/banks')
  async getBanks(@Req() req: any) {
    await this.getElevatedPmId(req);
    return this.getBanksUseCase.execute();
  }

  @Post('profile/verification')
  async submitVerification(@Req() req: any, @Body() body: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.prisma.upward_pm_verification.upsert({
      where: { pmId },
      create: {
        pmId,
        idType: body.idType,
        idNumber: body.idNumber,
        idImage: body.idImage,
        status: 'PENDING',
      },
      update: {
        idType: body.idType,
        idNumber: body.idNumber,
        idImage: body.idImage,
        status: 'PENDING',
      }
    });
  }

  @Get('profile/verification')
  async getVerificationStatus(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    const verification = await this.prisma.upward_pm_verification.findUnique({
      where: { pmId }
    });
    return verification || { status: 'NOT_SUBMITTED' };
  }

  // --- Payouts ---

  @Get('payouts')
  async getPayouts(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPmPayoutsUseCase.execute(pmId);
  }

  @Get('payouts/batch/:uuid')
  async getPayoutBreakdown(@Req() req: any, @Param('uuid') uuid: string) {
    return this.getPayoutBreakdownUseCase.execute(uuid);
  }

  // --- Credibility Requests ---

  @Get('credibility-requests')
  async getCredibilityRequests(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPendingCredibilityRequestsUseCase.execute(pmId);
  }

  @Patch('credibility-requests/:uuid/done')
  async markCredibilityRequestDone(@Param('uuid') uuid: string) {
    return this.markCredibilityRequestDoneUseCase.execute(uuid);
  }

  @Post('credibility-requests/:uuid/reject')
  async rejectCredibilityRequest(@Param('uuid') uuid: string) {
    return this.rejectCredibilityRequestUseCase.execute(uuid);
  }
}
