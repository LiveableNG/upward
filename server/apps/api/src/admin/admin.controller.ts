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
import { Request } from 'express'

interface AuthenticatedRequest extends Request {
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
  ) {
    return this.adminService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      role,
      country,
      city,
      selectedSession,
    })
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() data: Partial<CreateWaitlistEntryDto>) {
    return { data: await this.adminService.updateUser(id, data) }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.deleteUser(id, req.user.role) }
  }

  @Post('users/batch-delete')
  async batchDeleteUsers(@Body() body: { ids: string[] }, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.bulkDeleteUsers(body.ids, req.user.role) }
  }

  @Get('analytics')
  async getAnalytics() {
    return { data: await this.adminService.getAnalytics() }
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

  @Post('sessions/:sessionId/attendance/:userId')
  async markAttendance(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @Body('attended') attended: boolean,
  ) {
    return { data: await this.adminService.markAttendance(sessionId, userId, attended) }
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
  async createAdmin(@Body() body: { email: string; passwordPlain: string; role?: AdminRole }) {
    return { data: await this.adminService.createAdmin(body.email, body.passwordPlain, body.role) }
  }

  @Delete('admins/:id')
  @Roles(AdminRole.SUPERADMIN)
  async deleteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return { data: await this.adminService.deleteAdmin(id, req.user.id) }
  }

  @Patch('admins/:id/promote')
  @Roles(AdminRole.SUPERADMIN)
  async promoteAdmin(@Param('id') id: string) {
    return { data: await this.adminService.promoteAdmin(id) }
  }

  @Post('email/bulk')
  async sendBulkEmail(
    @Body() payload: { userIds: string[]; subject: string; content: string; sessionId?: string },
  ) {
    return { data: await this.adminService.sendBulkEmail(payload) }
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
}
