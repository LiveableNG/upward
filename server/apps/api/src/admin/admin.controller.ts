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
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { CreateWaitlistEntryDto, AdminRole } from '@upward/shared-types'
interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role: AdminRole
    mustChangePassword: boolean
  }
}
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('selectedSession') selectedSession?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('completed') completed?: string,
  ) {
    // Support comma-separated multi-values
    const toArray = (val?: string) =>
      val
        ? val
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined

    return this.adminService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      roles: toArray(role),
      countries: toArray(country),
      cities: toArray(city),
      selectedSessions: toArray(selectedSession),
      createdFrom,
      createdTo,
      completed,
    })
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() data: Partial<CreateWaitlistEntryDto>) {
    return { data: await this.adminService.updateUser(id, data) }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.deleteUser(id, req.user.role, req.user.id) }
  }

  @Post('users/batch-delete')
  async batchDeleteUsers(@Body() body: { ids: string[] }, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.bulkDeleteUsers(body.ids, req.user.role, req.user.id) }
  }

  @Get('analytics')
  async getAnalytics(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('selectedSession') selectedSession?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('completed') completed?: string,
  ) {
    const toArray = (val?: string) =>
      val
        ? val
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined

    return {
      data: await this.adminService.getAnalytics({
        search,
        roles: toArray(role),
        countries: toArray(country),
        cities: toArray(city),
        selectedSessions: toArray(selectedSession),
        createdFrom,
        createdTo,
        completed,
      }),
    }
  }

  @Get('drop-off')
  async getDropOffAnalysis() {
    return { data: await this.adminService.getDropOffAnalysis() }
  }

  @Get('sessions')
  async getSessions() {
    return { data: await this.adminService.getSessions() }
  }

  @Post('sessions')
  async createSession(
    @Body() data: { name: string; googleMeetLink: string; startTime: string; endTime: string },
  ) {
    return { data: await this.adminService.createSession(data) }
  }

  @Patch('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() data: { name?: string; googleMeetLink?: string; startTime?: string; endTime?: string },
  ) {
    return { data: await this.adminService.updateSession(id, data) }
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    return { data: await this.adminService.deleteSession(id) }
  }

  @Post('attendance')
  async markAttendance(@Body() data: { sessionId: string; userId: string; attended: boolean }) {
    return {
      data: await this.adminService.markAttendance(data.sessionId, data.userId, data.attended),
    }
  }

  @Patch('users/:userId/session')
  async changeUserSession(@Param('userId') userId: string, @Body('sessionId') sessionId: string) {
    return { data: await this.adminService.changeUserSession(userId, sessionId) }
  }

  // --- Admin Management (Superadmin Only) ---

  @Get('admins')
  @Roles(AdminRole.SUPERADMIN)
  async getAdmins() {
    return { data: await this.adminService.getAdmins() }
  }

  @Post('admins')
  @Roles(AdminRole.SUPERADMIN)
  async createAdmin(
    @Body() body: { email: string; passwordPlain: string; role?: AdminRole },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.adminService.createAdmin(
        body.email,
        body.passwordPlain,
        body.role,
        req.user.id,
      ),
    }
  }

  @Delete('admins/:id')
  @Roles(AdminRole.SUPERADMIN)
  async deleteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.deleteAdmin(id, req.user.id) }
  }

  @Patch('admins/:id/promote')
  @Roles(AdminRole.SUPERADMIN)
  async promoteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.promoteAdmin(id, req.user.id) }
  }

  @Patch('admins/:id/demote')
  @Roles(AdminRole.SUPERADMIN)
  async demoteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.demoteAdmin(id, req.user.id) }
  }

  @Post('email/bulk')
  async sendBulkEmail(
    @Body() payload: { userIds: string[]; subject: string; content: string; sessionId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.adminService.sendBulkEmail({
        ...payload,
        requesterId: req.user.id,
      }),
    }
  }

  @Post('email/resend-confirmation/:userId')
  async resendConfirmationEmail(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    return {
      data: await this.adminService.resendConfirmationEmail(userId, req.user.id),
    }
  }

  @Get('filters')
  async getFilterOptions() {
    return this.adminService.getFilterOptions()
  }
  @Post('change-password')
  async changePassword(
    @Body() body: { newPasswordPlain: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return { data: await this.adminService.changePassword(req.user.id, body.newPasswordPlain) }
  }

  @Get('ab-stats')
  async getAbStats() {
    return { data: await this.adminService.getAbStats() }
  }

  @Get('error-logs')
  async getErrorLogs() {
    return { data: await this.adminService.getErrorLogs() }
  }

  @Patch('error-logs/:id/resolve')
  async resolveError(@Param('id') id: string) {
    return { data: await this.adminService.resolveError(id) }
  }

  @Delete('error-logs/clear')
  async clearErrorLogs() {
    return { data: await this.adminService.clearErrorLogs() }
  }

  // --- Email Logs & System Templates ---

  @Get('email/logs')
  async getEmailLogs(
    @Query('email') email?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.adminService.getEmailLogs({ email, type, status }) }
  }

  @Get('system-email/:slug')
  async getSystemEmail(@Param('slug') slug: string) {
    return { data: await this.adminService.getSystemEmail(slug) }
  }

  @Post('system-email/:slug')
  async upsertSystemEmail(
    @Param('slug') slug: string,
    @Body() payload: { subject: string; htmlContent: string; textContent?: string },
  ) {
    return { data: await this.adminService.upsertSystemEmail(slug, payload) }
  }

  @Post('email/test-send')
  async sendTestEmail(
    @Body() payload: { emails: string[]; subject: string; content: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.adminService.sendTestEmails({
        ...payload,
        requesterId: req.user.id,
      }),
    }
  }

  @Post('email/logs/:id/retry')
  async retryEmail(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.retryEmail(id, req.user.id) }
  }
}
