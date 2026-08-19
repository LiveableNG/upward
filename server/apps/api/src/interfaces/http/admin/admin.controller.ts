import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { CreateWaitlistEntryDto, AdminRole } from '@upward/shared-types'
import { AuthenticatedRequest } from '../../../application/auth/interfaces/authenticated-request.interface'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'

// Use Cases
import { GetAdminsUseCase } from '../../../application/use-cases/admin/get-admins.use-case'
import { CreateAdminUseCase } from '../../../application/use-cases/admin/create-admin.use-case'
import { DeleteAdminUseCase } from '../../../application/use-cases/admin/delete-admin.use-case'
import { PromoteAdminUseCase } from '../../../application/use-cases/admin/promote-admin.use-case'
import { DemoteAdminUseCase } from '../../../application/use-cases/admin/demote-admin.use-case'
import { ChangeAdminRoleUseCase } from '../../../application/use-cases/admin/change-admin-role.use-case'
import { ChangeAdminPasswordUseCase } from '../../../application/use-cases/admin/change-admin-password.use-case'
import { SearchUsersUseCase } from '../../../application/use-cases/admin/search-users.use-case'
import { UpdateAdminDetailsUseCase } from '../../../application/use-cases/admin/update-admin-details.use-case'
import { GetQueuedSequencesUseCase } from '../../../application/use-cases/sequence/get-queued-sequences.use-case'
import { TriggerSequencesUseCase } from '../../../application/use-cases/sequence/trigger-sequences.use-case'

import { GetWaitlistUseCase } from '../../../application/use-cases/waitlist/get-waitlist.use-case'
import { UpdateWaitlistUserUseCase } from '../../../application/use-cases/waitlist/update-waitlist-user.use-case'
import { DeleteWaitlistUserUseCase } from '../../../application/use-cases/waitlist/delete-waitlist-user.use-case'
import { BulkDeleteWaitlistUsersUseCase } from '../../../application/use-cases/waitlist/bulk-delete-waitlist-users.use-case'
import { GetWaitlistFilterOptionsUseCase } from '../../../application/use-cases/waitlist/get-waitlist-filter-options.use-case'

import { GetSessionsUseCase } from '../../../application/use-cases/sessions/get-sessions.use-case'
import { CreateSessionUseCase } from '../../../application/use-cases/sessions/create-session.use-case'
import { UpdateSessionUseCase } from '../../../application/use-cases/sessions/update-session.use-case'
import { DeleteSessionUseCase } from '../../../application/use-cases/sessions/delete-session.use-case'
import { MarkAttendanceUseCase } from '../../../application/use-cases/sessions/mark-attendance.use-case'
import { ChangeUserSessionUseCase } from '../../../application/use-cases/sessions/change-user-session.use-case'

import { GetWaitlistAnalyticsUseCase } from '../../../application/use-cases/analytics/get-waitlist-analytics.use-case'
import { GetPerformanceMetricsUseCase } from '../../../application/use-cases/analytics/get-performance-metrics.use-case'
import { GetDropOffAnalysisUseCase } from '../../../application/use-cases/analytics/get-drop-off-analysis.use-case'
import { GetAbStatsUseCase } from '../../../application/use-cases/analytics/get-ab-stats.use-case'

import { SendBulkEmailUseCase } from '../../../application/use-cases/email/send-bulk-email.use-case'
import { ResendConfirmationEmailUseCase } from '../../../application/use-cases/email/resend-confirmation-email.use-case'
import { GetEmailLogsUseCase } from '../../../application/use-cases/email/get-email-logs.use-case'
import { GetSystemEmailUseCase } from '../../../application/use-cases/email/get-system-email.use-case'
import { UpsertSystemEmailUseCase } from '../../../application/use-cases/email/upsert-system-email.use-case'
import { SendTestEmailsUseCase } from '../../../application/use-cases/email/send-test-emails.use-case'
import { RetryEmailUseCase } from '../../../application/use-cases/email/retry-email.use-case'
import { RetryBatchEmailsUseCase } from '../../../application/use-cases/email/retry-batch-emails.use-case'
import { EmailBatchRetryManager } from '../../../application/use-cases/email/email-batch-retry-manager.service'

import { GetErrorLogsUseCase } from '../../../application/use-cases/system/get-error-logs.use-case'
import { ResolveErrorUseCase } from '../../../application/use-cases/system/resolve-error.use-case'
import { ClearErrorLogsUseCase } from '../../../application/use-cases/system/clear-error-logs.use-case'

import { GetAdminUserDetailUseCase } from '../../../application/use-cases/admin/get-admin-user-detail.use-case'
import { GetAdminPmDetailUseCase } from '../../../application/use-cases/admin/get-admin-pm-detail.use-case'
import { UpdateAdminUserUseCase } from '../../../application/use-cases/admin/update-admin-user.use-case'
import { UpdateAdminPmUseCase } from '../../../application/use-cases/admin/update-admin-pm.use-case'
import { SendAdminNotificationUseCase } from '../../../application/use-cases/admin/send-admin-notification.use-case'
import { GetInternalAccountsUseCase } from '../../../application/use-cases/admin/get-internal-accounts.use-case'
import { ToggleInternalAccountUseCase } from '../../../application/use-cases/admin/toggle-internal-account.use-case'
import { SyncTenantUseCase } from '../../../application/use-cases/admin/sync-tenant.use-case'
import { GetInvitationTrackerUseCase } from '../../../application/use-cases/admin/get-invitation-tracker.use-case'
import { ManagePmSubscriptionUseCase, ManagePmSubscriptionDto } from '../../../application/use-cases/admin/manage-pm-subscription.use-case'

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly getAdminsUseCase: GetAdminsUseCase,
    private readonly createAdminUseCase: CreateAdminUseCase,
    private readonly deleteAdminUseCase: DeleteAdminUseCase,
    private readonly promoteAdminUseCase: PromoteAdminUseCase,
    private readonly demoteAdminUseCase: DemoteAdminUseCase,
    private readonly changeAdminRoleUseCase: ChangeAdminRoleUseCase,
    private readonly updateAdminDetailsUseCase: UpdateAdminDetailsUseCase,
    private readonly changeAdminPasswordUseCase: ChangeAdminPasswordUseCase,
    private readonly getQueuedSequencesUseCase: GetQueuedSequencesUseCase,
    private readonly triggerSequencesUseCase: TriggerSequencesUseCase,
    private readonly getWaitlistUseCase: GetWaitlistUseCase,
    private readonly updateWaitlistUserUseCase: UpdateWaitlistUserUseCase,
    private readonly deleteWaitlistUserUseCase: DeleteWaitlistUserUseCase,
    private readonly bulkDeleteWaitlistUsersUseCase: BulkDeleteWaitlistUsersUseCase,
    private readonly getWaitlistFilterOptionsUseCase: GetWaitlistFilterOptionsUseCase,
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly updateSessionUseCase: UpdateSessionUseCase,
    private readonly deleteSessionUseCase: DeleteSessionUseCase,
    private readonly markAttendanceUseCase: MarkAttendanceUseCase,
    private readonly changeUserSessionUseCase: ChangeUserSessionUseCase,
    private readonly getWaitlistAnalyticsUseCase: GetWaitlistAnalyticsUseCase,
    private readonly getPerformanceMetricsUseCase: GetPerformanceMetricsUseCase,
    private readonly getDropOffAnalysisUseCase: GetDropOffAnalysisUseCase,
    private readonly getAbStatsUseCase: GetAbStatsUseCase,
    private readonly sendBulkEmailUseCase: SendBulkEmailUseCase,
    private readonly resendConfirmationEmailUseCase: ResendConfirmationEmailUseCase,
    private readonly getEmailLogsUseCase: GetEmailLogsUseCase,
    private readonly getSystemEmailUseCase: GetSystemEmailUseCase,
    private readonly upsertSystemEmailUseCase: UpsertSystemEmailUseCase,
    private readonly sendTestEmailsUseCase: SendTestEmailsUseCase,
    private readonly retryEmailUseCase: RetryEmailUseCase,
    private readonly retryBatchEmailsUseCase: RetryBatchEmailsUseCase,
    private readonly emailBatchRetryManager: EmailBatchRetryManager,
    private readonly getErrorLogsUseCase: GetErrorLogsUseCase,
    private readonly resolveErrorUseCase: ResolveErrorUseCase,
    private readonly clearErrorLogsUseCase: ClearErrorLogsUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly getAdminUserDetailUseCase: GetAdminUserDetailUseCase,
    private readonly getAdminPmDetailUseCase: GetAdminPmDetailUseCase,
    private readonly updateAdminUserUseCase: UpdateAdminUserUseCase,
    private readonly updateAdminPmUseCase: UpdateAdminPmUseCase,
    private readonly sendAdminNotificationUseCase: SendAdminNotificationUseCase,
    private readonly getInternalAccountsUseCase: GetInternalAccountsUseCase,
    private readonly toggleInternalAccountUseCase: ToggleInternalAccountUseCase,
    private readonly syncTenantUseCase: SyncTenantUseCase,
    private readonly getInvitationTrackerUseCase: GetInvitationTrackerUseCase,
    private readonly managePmSubscriptionUseCase: ManagePmSubscriptionUseCase,
    private readonly s3Service: S3Service,
  ) {}

  @Get('users/search')
  async searchUsers(@Query('q') query: string) {
    return { data: await this.searchUsersUseCase.execute(query) }
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isWaitlist') isWaitlist?: string,
    @Query('isInvited') isInvited?: string,
    @Query('unsubscribed') unsubscribed?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.getWaitlistUseCase.execute({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      isWaitlist,
      isInvited,
      unsubscribed,
      createdFrom,
      createdTo,
    })
  }

  @Patch('users/:id')
  @Roles(AdminRole.DEVELOPER)
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return { data: await this.updateAdminUserUseCase.execute(id, data) }
  }

  @Get('users/:uuid')
  async getUserDetail(@Param('uuid') uuid: string) {
    return { data: await this.getAdminUserDetailUseCase.execute(uuid) }
  }

  @Post('users/sync-tenant/:uuid')
  async syncTenant(@Param('uuid') uuid: string) {
    await this.syncTenantUseCase.execute(uuid)
    return { success: true }
  }

  @Get('pms/:uuid')
  async getPmDetail(@Param('uuid') uuid: string) {
    return { data: await this.getAdminPmDetailUseCase.execute(uuid) }
  }

  @Patch('pms/:uuid')
  @Roles(AdminRole.DEVELOPER)
  async updatePmDetail(
    @Param('uuid') uuid: string,
    @Body() data: any,
    @Req() req: AuthenticatedRequest
  ) {
    return { data: await (this.updateAdminPmUseCase as any).execute(uuid, data, req.user.id) }
  }

  @Post('pms/:uuid/subscription/manage')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async managePmSubscription(
    @Param('uuid') pmUuid: string,
    @Body() body: ManagePmSubscriptionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.managePmSubscriptionUseCase.execute(pmUuid, req.user.id, body)
  }

  @Post('users/:uuid/notify')
  async notifyTenant(@Param('uuid') uuid: string, @Body() body: { title: string; message: string }) {
    return {
      data: await this.sendAdminNotificationUseCase.execute(uuid, {
        title: body.title,
        message: body.message,
        userType: 'TENANT',
      }),
    }
  }

  @Post('pms/:uuid/notify')
  async notifyPm(@Param('uuid') uuid: string, @Body() body: { title: string; message: string }) {
    return {
      data: await this.sendAdminNotificationUseCase.execute(uuid, {
        title: body.title,
        message: body.message,
        userType: 'PM',
      }),
    }
  }

  @Delete('users/:id')
  @Roles(AdminRole.DEVELOPER)
  async deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.deleteWaitlistUserUseCase.execute(id, req.user.role, req.user.id) }
  }

  @Post('users/batch-delete')
  @Roles(AdminRole.DEVELOPER)
  async batchDeleteUsers(@Body() body: { ids: string[] }, @Req() req: AuthenticatedRequest) {
    return {
      data: await this.bulkDeleteWaitlistUsersUseCase.execute(body.ids, req.user.role, req.user.id),
    }
  }

  @Get('analytics')
  async getAnalytics(
    @Query('search') search?: string,
    @Query('isWaitlist') isWaitlist?: string,
    @Query('isInvited') isInvited?: string,
    @Query('unsubscribed') unsubscribed?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return {
      data: await this.getWaitlistAnalyticsUseCase.execute({
        search,
        isWaitlist,
        isInvited,
        unsubscribed,
        createdFrom,
        createdTo,
      }),
    }
  }

  @Get('performance-metrics')
  async getPerformanceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.getPerformanceMetricsUseCase.execute({
      startDate,
      endDate,
      search,
    })
  }

  @Get('drop-off')
  async getDropOffAnalysis() {
    return { data: await this.getDropOffAnalysisUseCase.execute() }
  }

  @Get('sessions')
  async getSessions() {
    return { data: await this.getSessionsUseCase.execute() }
  }

  @Post('sessions')
  async createSession(
    @Body() data: { name: string; googleMeetLink: string; startTime: string; endTime: string },
  ) {
    return { data: await this.createSessionUseCase.execute(data) }
  }

  @Patch('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() data: { name?: string; googleMeetLink?: string; startTime?: string; endTime?: string },
  ) {
    return { data: await this.updateSessionUseCase.execute(id, data) }
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    return { data: await this.deleteSessionUseCase.execute(id) }
  }

  @Post('attendance')
  async markAttendance(@Body() data: { sessionId: string; userId: string; attended: boolean }) {
    return {
      data: await this.markAttendanceUseCase.execute(data.sessionId, data.userId, data.attended),
    }
  }

  @Patch('users/:userId/session')
  async changeUserSession(@Param('userId') userId: string, @Body('sessionId') sessionId: string) {
    return { data: await this.changeUserSessionUseCase.execute(userId, sessionId) }
  }

  @Get('admins')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async getAdmins() {
    return { data: await this.getAdminsUseCase.execute() }
  }

  @Post('admins')
  @Roles(AdminRole.DEVELOPER)
  async createAdmin(
    @Body() body: { email: string; passwordPlain: string; role?: AdminRole },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.createAdminUseCase.execute(
        body.email,
        body.passwordPlain,
        body.role,
        req.user.id,
      ),
    }
  }

  @Delete('admins/:id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async deleteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.deleteAdminUseCase.execute(id, req.user.id, req.user.role) }
  }

  @Patch('admins/:id/promote')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async promoteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.promoteAdminUseCase.execute(id, req.user.id) }
  }

  @Patch('admins/:id/demote')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async demoteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.demoteAdminUseCase.execute(id, req.user.id) }
  }

  @Patch('admins/:id/role')
  @Roles(AdminRole.DEVELOPER)
  async changeAdminRole(@Param('id') id: string, @Body() body: { role: AdminRole }, @Req() req: AuthenticatedRequest) {
    return { data: await this.changeAdminRoleUseCase.execute(id, body.role, req.user.id) }
  }

  @Patch('admins/:id/details')
  @Roles(AdminRole.DEVELOPER)
  async updateAdminDetails(@Param('id') id: string, @Body() body: { phone?: string; receivesSystemAlerts?: boolean }, @Req() req: AuthenticatedRequest) {
    return { data: await this.updateAdminDetailsUseCase.execute(id, body, req.user.role as AdminRole) }
  }

  // --- Sequence Management ---

  @Get('sequences/queued')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async getQueuedSequences() {
    return this.getQueuedSequencesUseCase.execute()
  }

  @Post('sequences/trigger')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async triggerSequences(
    @Body() data: { channel: 'EMAIL' | 'WHATSAPP'; stage: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!data.channel || !data.stage) {
      throw new BadRequestException('channel and stage are required')
    }
    await this.triggerSequencesUseCase.execute(data.channel, data.stage, req.user.id)
    return { success: true }
  }

  @Post('email/bulk')
  async sendBulkEmail(
    @Body() payload: { userIds: string[]; subject: string; content: string; targetGroup?: 'TENANTS' | 'PMS' | 'WAITLIST'; sessionId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.sendBulkEmailUseCase.execute({
        ...payload,
        requesterId: req.user.id,
      }),
    }
  }

  @Post('email/resend-confirmation/:userId')
  async resendConfirmationEmail(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    return {
      data: await this.resendConfirmationEmailUseCase.execute(userId, req.user.id),
    }
  }

  @Get('filters')
  async getFilterOptions() {
    return this.getWaitlistFilterOptionsUseCase.execute()
  }

  @Post('change-password')
  async changePassword(
    @Body() body: { newPasswordPlain: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.changeAdminPasswordUseCase.execute(req.user.id, body.newPasswordPlain),
    }
  }

  @Get('ab-stats')
  async getAbStats() {
    return { data: await this.getAbStatsUseCase.execute() }
  }

  @Get('error-logs')
  async getErrorLogs() {
    return { data: await this.getErrorLogsUseCase.execute() }
  }

  @Patch('error-logs/:id/resolve')
  async resolveError(@Param('id') id: string) {
    return { data: await this.resolveErrorUseCase.execute(id) }
  }

  @Delete('error-logs/clear')
  async clearErrorLogs() {
    return { data: await this.clearErrorLogsUseCase.execute() }
  }

  @Get('email/logs')
  async getEmailLogs(
    @Query('email') email?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('acquisition') acquisition?: string,
    @Query('channel') channel?: string,
    @Query('opened') opened?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getEmailLogsUseCase.execute({
      email,
      type,
      status,
      acquisition,
      channel,
      opened,
      date,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    })
  }

  @Get('system-email/:slug')
  async getSystemEmail(@Param('slug') slug: string) {
    return { data: await this.getSystemEmailUseCase.execute(slug) }
  }

  @Post('system-email/:slug')
  async upsertSystemEmail(
    @Param('slug') slug: string,
    @Body() payload: { subject: string; htmlContent: string; textContent?: string },
  ) {
    return { data: await this.upsertSystemEmailUseCase.execute(slug, payload) }
  }

  @Post('email/test-send')
  async sendTestEmail(
    @Body() payload: { emails: string[]; subject: string; content: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.sendTestEmailsUseCase.execute({
        ...payload,
        requesterId: req.user.id,
      }),
    }
  }

  @Post('email/logs/:id/retry')
  async retryEmail(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.retryEmailUseCase.execute(id, req.user.id) }
  }

  @Post('email/logs/retry-batch')
  async retryBatchEmails(
    @Query('email') qEmail?: string,
    @Query('type') qType?: string,
    @Query('acquisition') qAcquisition?: string,
    @Body() body?: { email?: string; type?: string; acquisition?: string },
    @Req() req?: AuthenticatedRequest,
  ) {
    const email = qEmail || body?.email
    const type = qType || body?.type
    const acquisition = qAcquisition || body?.acquisition
    const requesterId = req?.user?.id || 'SYSTEM'
    return this.retryBatchEmailsUseCase.execute({ email, type, acquisition }, requesterId)
  }

  @Get('email/logs/jobs/:jobId/status')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = this.emailBatchRetryManager.getJob(jobId)
    if (!job) {
      return { success: false, message: 'Job not found' }
    }
    return { success: true, job }
  }

  @Post('email/upload-image')
  async uploadEmailImage(
    @Body() body: { base64Data: string; contentType: string; originalName: string },
  ) {
    if (!body.base64Data || !body.contentType) {
      throw new BadRequestException('base64Data and contentType are required')
    }
    if (!body.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed')
    }
    const buffer = Buffer.from(body.base64Data, 'base64')
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 10MB.')
    }
    const uuid = randomUUID()
    const extension = body.originalName?.split('.').pop() || body.contentType.split('/')[1] || 'png'
    const key = `email-campaigns/images/${uuid}.${extension}`
    const url = await this.s3Service.uploadBuffer(buffer, key, body.contentType)
    return { success: true, url }
  }

  @Get('internal-accounts')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getInternalAccountsList() {
    return this.getInternalAccountsUseCase.execute()
  }

  @Patch('internal-accounts/:type/:uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async toggleInternalAccountStatus(
    @Param('type') type: 'user' | 'pm' | 'guest' | 'company' | 'waitlist',
    @Param('uuid') uuid: string,
    @Body() body: { isInternal: boolean }
  ) {
    if (typeof body.isInternal !== 'boolean') {
      throw new BadRequestException('isInternal must be a boolean')
    }
    return this.toggleInternalAccountUseCase.execute(type, uuid, body.isInternal)
  }

  @Get('invitation-tracker')
  async getInvitationTracker() {
    return this.getInvitationTrackerUseCase.execute()
  }
}
