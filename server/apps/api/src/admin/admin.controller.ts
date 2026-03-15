import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { AdminService } from './admin.service'
import { CreateWaitlistEntryDto } from '@upward/shared-types'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers() {
    return { data: await this.adminService.getAllUsers() }
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() data: Partial<CreateWaitlistEntryDto>) {
    return { data: await this.adminService.updateUser(id, data) }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return { data: await this.adminService.deleteUser(id) }
  }

  @Post('users/bulk')
  async bulkUpload(@Body() users: CreateWaitlistEntryDto[]) {
    return { data: await this.adminService.bulkUpload(users) }
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

  @Post('sessions/attendance')
  async markAttendance(@Body() data: { sessionId: string; userId: string; attended: boolean }) {
    return {
      data: await this.adminService.markAttendance(data.sessionId, data.userId, data.attended),
    }
  }

  @Post('email/bulk')
  async sendBulkEmail(
    @Body() payload: { userIds: string[]; subject: string; content: string; sessionId?: string },
  ) {
    return { data: await this.adminService.sendBulkEmail(payload) }
  }
}
