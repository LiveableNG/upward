import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetAdminLogsUseCase } from '../../../application/use-cases/admin-log/get-admin-logs.use-case'
import { LogAdminActionUseCase } from '../../../application/use-cases/admin-log/log-admin-action.use-case'

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
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminLogController {
  constructor(
    private readonly getLogsUseCase: GetAdminLogsUseCase,
    private readonly logActionUseCase: LogAdminActionUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN)
  async getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getLogsUseCase.execute(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50)
  }

  @Post('event')
  async logFrontendEvent(
    @Req() req: AuthenticatedRequest,
    @Body() body: { action: string; details?: string },
  ) {
    const ua = req.headers['user-agent']
    const ip = req.ip

    return this.logActionUseCase.execute(req.user.id, body.action, body.details, ip, ua)
  }
}
