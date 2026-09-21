import { Controller, Post, Get, Patch, Delete, Body, UseGuards, Query, Param, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { CreatePropertyUseCase } from '../../../application/pm/use-cases/create-property.use-case';
import { UpdatePropertyUseCase } from '../../../application/pm/use-cases/update-property.use-case';
import { DeletePropertyUseCase } from '../../../application/pm/use-cases/delete-property.use-case';
import { GetPmPropertiesUseCase } from '../../../application/pm/use-cases/get-pm-properties.use-case';
import { GetPmDashboardSummaryUseCase } from '../../../application/pm/use-cases/get-pm-dashboard-summary.use-case';
import { GetPmPropertyUseCase } from '../../../application/pm/use-cases/get-pm-property.use-case';
import { BulkCreateUnitsUseCase } from '../../../application/pm/use-cases/bulk-create-units.use-case';
import { GetPmUnitsUseCase } from '../../../application/pm/use-cases/get-pm-units.use-case';
import { GetUnitUseCase } from '../../../application/pm/use-cases/get-unit.use-case';
import { UpdateUnitUseCase } from '../../../application/pm/use-cases/update-unit.use-case';
import { DeleteUnitUseCase } from '../../../application/pm/use-cases/delete-unit.use-case';
import { GetUnitPaymentsUseCase } from '../../../application/pm/use-cases/get-unit-payments.use-case';
import { AddUnitPaymentUseCase } from '../../../application/pm/use-cases/add-unit-payment.use-case';
import { UpdateRentPaymentUseCase } from '../../../application/pm/use-cases/update-rent-payment.use-case';
import { DeleteRentPaymentUseCase } from '../../../application/pm/use-cases/delete-rent-payment.use-case';
import { GetPropertyImageUploadUrlUseCase } from '../../../application/pm/use-cases/get-property-image-upload-url.use-case';
import { UploadPropertyImageUseCase } from '../../../application/pm/use-cases/upload-property-image.use-case';
import { SyncUnitToUpwardUseCase } from '../../../application/pm/use-cases/units/sync-unit.use-case';
import { CreatePmPaymentRequestUseCase, CreatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/create-pm-payment-request.use-case';
import { GetPmPaymentRequestsUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-requests.use-case';
import { GetPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-request.use-case';
import { ResendPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/resend-pm-payment-request.use-case';
import { UpdatePmPaymentRequestUseCase, UpdatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/update-pm-payment-request.use-case';
import { CancelPmPaymentRequestUseCase } from '../../../application/pm/use-cases/payments/cancel-pm-payment-request.use-case';
import { BulkFullImportUseCase } from '../../../application/pm/use-cases/bulk-full-import.use-case';
import { BulkInviteTenantsUseCase } from '../../../application/pm/use-cases/tenants/bulk-invite-tenants.use-case';
import { SendLandlordReportUseCase } from '../../../application/pm/use-cases/send-landlord-report.use-case';
import { GetLandlordReportsUseCase } from '../../../application/pm/use-cases/get-landlord-reports.use-case';
import { GetLandlordReportUseCase } from '../../../application/pm/use-cases/get-landlord-report.use-case';
import { PmBulkRentReminderUseCase } from '../../../application/pm/use-cases/pm-bulk-rent-reminder.use-case';
import { CreatePropertyDto, UpdatePropertyDto, BulkCreateUnitsDto, BulkFullImportDto } from '../../../application/pm/dtos/property.dto';
import { SendLandlordReportDto } from '../../../application/pm/dtos/landlord.dto';
import { InviteTeamMemberDto, UpdateTeamMemberPermissionsDto, TransferTeamPropertiesDto } from '../../../application/pm/dtos/team.dto';
import { InviteTeamMemberUseCase } from '../../../application/pm/use-cases/team/invite-team-member.use-case';
import { ResendTeamInviteUseCase } from '../../../application/pm/use-cases/team/resend-team-invite.use-case';
import { GetApprovalRequestsUseCase } from '../../../application/pm/use-cases/approvals/get-approval-requests.use-case';
import { ResolveApprovalRequestUseCase } from '../../../application/pm/use-cases/approvals/resolve-approval-request.use-case';
import { GetTeamMembersUseCase } from '../../../application/pm/use-cases/team/get-team-members.use-case';
import { UpdateTeamMemberPermissionsUseCase } from '../../../application/pm/use-cases/team/update-team-member-permissions.use-case';
import { RevokeTeamMemberUseCase } from '../../../application/pm/use-cases/team/revoke-team-member.use-case';
import { TransferTeamPropertiesUseCase } from '../../../application/pm/use-cases/team/transfer-team-properties.use-case';
import { BulkAddRentHistoryUseCase } from '../../../application/pm/use-cases/bulk-add-rent-history.use-case';
import { GetPmLandlordsUseCase } from '../../../application/pm/use-cases/landlord/get-pm-landlords.use-case';
import { CreatePmLandlordUseCase } from '../../../application/pm/use-cases/landlord/create-pm-landlord.use-case';
import { CreatePmLandlordDto } from '../../../application/pm/dtos/landlord.dto';
import { GetPmPayoutsUseCase, GetPayoutBreakdownUseCase, GetPmUnresolvedTransactionsUseCase } from '../../../application/use-cases/payments/payment.use-cases';
import { ResolvePendingRefundUseCase, RefundResolutionAction } from '../../../application/pm/use-cases/payments/resolve-refund.use-case';

@Controller('pm')
@UseGuards(JwtAuthGuard)
export class PmPropertyController {
  constructor(
    private readonly createPropertyUseCase: CreatePropertyUseCase,
    private readonly updatePropertyUseCase: UpdatePropertyUseCase,
    private readonly deletePropertyUseCase: DeletePropertyUseCase,
    private readonly getPmPropertiesUseCase: GetPmPropertiesUseCase,
    private readonly getPmDashboardSummaryUseCase: GetPmDashboardSummaryUseCase,
    private readonly getPmPropertyUseCase: GetPmPropertyUseCase,
    private readonly bulkCreateUnitsUseCase: BulkCreateUnitsUseCase,
    private readonly getPmUnitsUseCase: GetPmUnitsUseCase,
    private readonly getUnitUseCase: GetUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly deleteUnitUseCase: DeleteUnitUseCase,
    private readonly getUnitPaymentsUseCase: GetUnitPaymentsUseCase,
    private readonly addUnitPaymentUseCase: AddUnitPaymentUseCase,
    private readonly updateRentPaymentUseCase: UpdateRentPaymentUseCase,
    private readonly deleteRentPaymentUseCase: DeleteRentPaymentUseCase,
    private readonly getPropertyImageUploadUrlUseCase: GetPropertyImageUploadUrlUseCase,
    private readonly uploadPropertyImageUseCase: UploadPropertyImageUseCase,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
    private readonly createPmPaymentRequestUseCase: CreatePmPaymentRequestUseCase,
    private readonly getPmPaymentRequestsUseCase: GetPmPaymentRequestsUseCase,
    private readonly getPmPaymentRequestUseCase: GetPmPaymentRequestUseCase,
    private readonly resendPmPaymentRequestUseCase: ResendPmPaymentRequestUseCase,
    private readonly updatePmPaymentRequestUseCase: UpdatePmPaymentRequestUseCase,
    private readonly cancelPmPaymentRequestUseCase: CancelPmPaymentRequestUseCase,
    private readonly bulkFullImportUseCase: BulkFullImportUseCase,
    private readonly bulkInviteTenantsUseCase: BulkInviteTenantsUseCase,
    private readonly sendLandlordReportUseCase: SendLandlordReportUseCase,
    private readonly getLandlordReportsUseCase: GetLandlordReportsUseCase,
    private readonly getLandlordReportUseCase: GetLandlordReportUseCase,
    private readonly pmBulkRentReminderUseCase: PmBulkRentReminderUseCase,
    private readonly inviteTeamMemberUseCase: InviteTeamMemberUseCase,
    private readonly resendTeamInviteUseCase: ResendTeamInviteUseCase,
    private readonly getApprovalRequestsUseCase: GetApprovalRequestsUseCase,
    private readonly resolveApprovalRequestUseCase: ResolveApprovalRequestUseCase,
    private readonly getTeamMembersUseCase: GetTeamMembersUseCase,
    private readonly updateTeamMemberPermissionsUseCase: UpdateTeamMemberPermissionsUseCase,
    private readonly revokeTeamMemberUseCase: RevokeTeamMemberUseCase,
    private readonly transferTeamPropertiesUseCase: TransferTeamPropertiesUseCase,
    private readonly bulkAddRentHistoryUseCase: BulkAddRentHistoryUseCase,
    private readonly getPmLandlordsUseCase: GetPmLandlordsUseCase,
    private readonly createPmLandlordUseCase: CreatePmLandlordUseCase,
    private readonly getPmPayoutsUseCase: GetPmPayoutsUseCase,
    private readonly getPayoutBreakdownUseCase: GetPayoutBreakdownUseCase,
    private readonly getPmUnresolvedTransactionsUseCase: GetPmUnresolvedTransactionsUseCase,
    private readonly resolvePendingRefundUseCase: ResolvePendingRefundUseCase,
  ) {}

  @Post('units/:unitUuid/payments/bulk')
  async bulkAddRentHistory(
    @CurrentPmActor() actor: PmActorContext,
    @Param('unitUuid') unitUuid: string, 
    @Body() dto: any
  ) {
    return this.bulkAddRentHistoryUseCase.execute(actor.ownerPmId, { ...dto, unitUuid }, actor);
  }

  @Post('properties')
  async createProperty(@CurrentPmActor() actor: PmActorContext, @Body() dto: CreatePropertyDto) {
    return this.createPropertyUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Patch('properties/:propertyUuid')
  async updateProperty(@CurrentPmActor() actor: PmActorContext, @Param('propertyUuid') propertyUuid: string, @Body() dto: UpdatePropertyDto) {
    return this.updatePropertyUseCase.execute(actor.ownerPmId, propertyUuid, dto, actor);
  }

  @Delete('properties/:propertyUuid')
  async deleteProperty(@CurrentPmActor() actor: PmActorContext, @Param('propertyUuid') propertyUuid: string) {
    return this.deletePropertyUseCase.execute(actor.ownerPmId, propertyUuid, actor);
  }

  @Get('dashboard/summary')
  async getDashboardSummary(@CurrentPmActor() actor: PmActorContext, @Query() query: any) {
    return this.getPmDashboardSummaryUseCase.execute(actor.ownerPmId, query, actor);
  }

  @Get('properties')
  async getProperties(@CurrentPmActor() actor: PmActorContext) {
    return this.getPmPropertiesUseCase.execute(actor.ownerPmId, actor);
  }

  @Get('properties/:propertyUuid')
  async getProperty(@CurrentPmActor() actor: PmActorContext, @Param('propertyUuid') propertyUuid: string) {
    return this.getPmPropertyUseCase.execute(actor.ownerPmId, propertyUuid, actor);
  }

  @Post('units/bulk')
  async bulkCreateUnits(@CurrentPmActor() actor: PmActorContext, @Body() dto: BulkCreateUnitsDto) {
    return this.bulkCreateUnitsUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Post('import/bulk')
  async bulkFullImport(@CurrentPmActor() actor: PmActorContext, @Body() dto: BulkFullImportDto) {
    return this.bulkFullImportUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Get('units')
  async getUnits(@CurrentPmActor() actor: PmActorContext, @Query('propertyUuid') propertyUuid?: string) {
    return this.getPmUnitsUseCase.execute(actor.ownerPmId, propertyUuid, actor);
  }

  @Get('units/:unitUuid')
  async getUnit(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string) {
    return this.getUnitUseCase.execute(actor.ownerPmId, unitUuid, actor);
  }

  @Patch('units/:unitUuid')
  async updateUnit(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    return this.updateUnitUseCase.execute(actor.ownerPmId, unitUuid, dto, actor);
  }

  @Delete('units/:unitUuid')
  async deleteUnit(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string) {
    return this.deleteUnitUseCase.execute(actor.ownerPmId, unitUuid, actor);
  }

  @Get('units/:unitUuid/payments')
  async getUnitPayments(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string) {
    return this.getUnitPaymentsUseCase.execute(actor.ownerPmId, unitUuid, actor);
  }

  @Post('units/:unitUuid/payments')
  async addUnitPayment(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string, @Body() dto: any) {
    return this.addUnitPaymentUseCase.execute(actor.ownerPmId, unitUuid, dto, actor);
  }

  @Patch('units/:unitUuid/payments/:paymentUuid')
  async updateUnitPayment(@CurrentPmActor() actor: PmActorContext, @Param('paymentUuid') paymentUuid: string, @Body() dto: any) {
    return this.updateRentPaymentUseCase.execute(actor.ownerPmId, paymentUuid, dto, actor);
  }

  @Delete('units/:unitUuid/payments/:paymentUuid')
  async deleteUnitPayment(@CurrentPmActor() actor: PmActorContext, @Param('paymentUuid') paymentUuid: string) {
    return this.deleteRentPaymentUseCase.execute(actor.ownerPmId, paymentUuid, actor);
  }

  @Post('units/:unitUuid/sync-to-upward')
  async syncToUpward(@CurrentPmActor() actor: PmActorContext, @Param('unitUuid') unitUuid: string) {
    return this.syncUnitToUpwardUseCase.execute(unitUuid, actor.ownerPmId);
  }

  @Post('properties/image-upload-url')
  async getImageUploadUrl(@CurrentPmActor() actor: PmActorContext, @Body() body: { contentType: string; filename: string }) {
    return this.getPropertyImageUploadUrlUseCase.execute(actor.ownerPmId, body.contentType, body.filename);
  }

  @Post('properties/image-upload')
  async uploadImage(@CurrentPmActor() actor: PmActorContext, @Body() body: { base64Data: string; contentType: string; filename?: string }) {
    return this.uploadPropertyImageUseCase.execute(actor.ownerPmId, body.base64Data, body.contentType, body.filename);
  }

  @Post('payment-requests')
  async createPaymentRequest(@CurrentPmActor() actor: PmActorContext, @Body() dto: CreatePmPaymentRequestDto) {
    return this.createPmPaymentRequestUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Get('payment-requests')
  async getPaymentRequests(@CurrentPmActor() actor: PmActorContext) {
    return this.getPmPaymentRequestsUseCase.execute(actor.ownerPmId, actor);
  }

  @Get('payment-requests/:uuid')
  async getPaymentRequest(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.getPmPaymentRequestUseCase.execute(actor.ownerPmId, uuid);
  }

  @Post('payment-requests/:uuid/resend')
  async resendPaymentRequest(
    @CurrentPmActor() actor: PmActorContext, 
    @Param('uuid') uuid: string,
    @Body() body: { email?: string; channels?: ('EMAIL' | 'WHATSAPP' | 'SMS')[] }
  ) {
    return this.resendPmPaymentRequestUseCase.execute(actor.ownerPmId, uuid, body.email, body.channels);
  }

  @Patch('payment-requests/:uuid')
  async updatePaymentRequest(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string, @Body() dto: UpdatePmPaymentRequestDto) {
    return this.updatePmPaymentRequestUseCase.execute(actor.ownerPmId, uuid, dto);
  }

  @Delete('payment-requests/:uuid')
  async cancelPaymentRequest(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.cancelPmPaymentRequestUseCase.execute(actor.ownerPmId, uuid, actor);
  }

  @Get('landlords')
  async getLandlords(@CurrentPmActor() actor: PmActorContext) {
    return this.getPmLandlordsUseCase.execute(actor.ownerPmId, actor);
  }

  @Post('landlords')
  async createLandlord(@CurrentPmActor() actor: PmActorContext, @Body() dto: CreatePmLandlordDto) {
    if (actor.isEmployee) {
      throw new ForbiddenException('Employees can only assign or add landlords during property creation or editing');
    }
    return this.createPmLandlordUseCase.execute(actor.ownerPmId, dto);
  }

  @Post('landlords/send-report')
  async sendLandlordReport(@CurrentPmActor() actor: PmActorContext, @Body() dto: SendLandlordReportDto) {
    return this.sendLandlordReportUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Get('landlords/:landlordEmail/reports')
  async getLandlordReports(@CurrentPmActor() actor: PmActorContext, @Param('landlordEmail') landlordEmail: string) {
    return this.getLandlordReportsUseCase.execute(actor.ownerPmId, landlordEmail, actor);
  }

  @Get('landlords/reports/:uuid')
  async getLandlordReport(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.getLandlordReportUseCase.execute(actor.ownerPmId, uuid, actor);
  }

  @Post('landlords/:landlordEmail/bulk-reminders')
  async sendBulkReminders(@CurrentPmActor() actor: PmActorContext, @Param('landlordEmail') landlordEmail: string) {
    return this.pmBulkRentReminderUseCase.execute(actor.ownerPmId, landlordEmail, actor);
  }

  @Get('payouts')
  async getPayouts(@CurrentPmActor() actor: PmActorContext) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Payouts are only accessible by company administrators');
    }
    return this.getPmPayoutsUseCase.execute(actor.ownerPmId);
  }

  @Get('payouts/batch/:uuid')
  async getPayoutBreakdown(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Payouts are only accessible by company administrators');
    }
    return this.getPayoutBreakdownUseCase.execute(uuid);
  }

  @Get('payments/unresolved')
  async getUnresolvedTransactions(@CurrentPmActor() actor: PmActorContext) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Unresolved payment actions are only accessible by company administrators');
    }
    return this.getPmUnresolvedTransactionsUseCase.execute(actor.ownerPmId);
  }

  @Post('payments/unresolved/:uuid/resolve')
  async resolveTransaction(
    @CurrentPmActor() actor: PmActorContext, 
    @Param('uuid') uuid: string, 
    @Body() body: { action: RefundResolutionAction }
  ) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Unresolved payment actions are only accessible by company administrators');
    }
    return this.resolvePendingRefundUseCase.execute(actor.ownerPmId, uuid, body.action);
  }

  @Post('team/invite')
  async inviteTeamMember(@CurrentPmActor() actor: PmActorContext, @Body() dto: InviteTeamMemberDto) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Team management is only accessible by company administrators');
    }
    return this.inviteTeamMemberUseCase.execute(actor.ownerPmId, dto);
  }

  @Post('team/:uuid/resend-invite')
  async resendTeamInvite(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    if (actor.isEmployee) {
      throw new ForbiddenException('Team management is only accessible by company administrators');
    }
    return this.resendTeamInviteUseCase.execute(actor.ownerPmId, uuid);
  }

  @Get('team')
  async getTeamMembers(@CurrentPmActor() actor: PmActorContext) {
    if (actor.isEmployee) {
      return [];
    }
    return this.getTeamMembersUseCase.execute(actor.ownerPmId);
  }

  @Patch('team/:uuid/permissions')
  async updateTeamMemberPermissions(
    @CurrentPmActor() actor: PmActorContext, 
    @Param('uuid') uuid: string, 
    @Body() dto: UpdateTeamMemberPermissionsDto
  ) {
    if (actor.isEmployee) {
      throw new ForbiddenException('Team management is only accessible by company administrators');
    }
    return this.updateTeamMemberPermissionsUseCase.execute(actor.ownerPmId, uuid, dto);
  }

  @Post('team/transfer')
  async transferTeamProperties(@CurrentPmActor() actor: PmActorContext, @Body() dto: TransferTeamPropertiesDto) {
    if (actor.isEmployee) {
      throw new ForbiddenException('Team management is only accessible by company administrators');
    }
    return this.transferTeamPropertiesUseCase.execute(actor.ownerPmId, dto);
  }

  @Delete('team/:uuid')
  async revokeTeamMember(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    if (actor.isEmployee) {
      throw new ForbiddenException('Team management is only accessible by company administrators');
    }
    return this.revokeTeamMemberUseCase.execute(actor.ownerPmId, uuid);
  }

  @Get('approval-requests')
  async getApprovalRequests(@CurrentPmActor() actor: PmActorContext) {
    return this.getApprovalRequestsUseCase.execute(actor.ownerPmId);
  }

  @Post('approval-requests/:uuid/resolve')
  async resolveApprovalRequest(
    @CurrentPmActor() actor: PmActorContext,
    @Param('uuid') uuid: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }
  ) {
    if (actor.isEmployee) {
      throw new UnauthorizedException('Only company administrators can resolve approval requests');
    }
    return this.resolveApprovalRequestUseCase.execute(actor.ownerPmId, uuid, body.action, body.rejectionReason);
  }
}

