import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AdminLogService } from './admin-log.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'

interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role: AdminRole
  }
  headers: Record<string, string>
  ip: string
}

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminLogController {
  constructor(private readonly adminLogService: AdminLogService) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN)
  async getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminLogService.getLogs(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50)
  }

  @Post('event')
  async logFrontendEvent(
    @Req() req: AuthenticatedRequest,
    @Body() body: { action: string; details?: string },
  ) {
    const ua = req.headers['user-agent']
    const ip = req.ip

    return this.adminLogService.logAction(req.user.id, body.action, body.details, ip, ua)
  }
}
