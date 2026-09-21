import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetAdminLoginSessionsUseCase } from '../../../application/use-cases/admin/get-admin-login-sessions.use-case'

@Controller('admin/login-sessions')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminLoginSessionsController {
  constructor(
    private readonly getAdminLoginSessionsUseCase: GetAdminLoginSessionsUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getLoginSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('dateRange') dateRange?: string, // today | 7d | 30d | all
    @Query('role') roleFilter?: string, // TENANT | PM | ALL
    @Query('device') deviceFilter?: string, // mobile | desktop | all
    @Query('browser') browserFilter?: string,
    @Query('location') locationFilter?: string,
  ) {
    return this.getAdminLoginSessionsUseCase.execute({
      page,
      limit,
      search,
      dateRange,
      role: roleFilter,
      device: deviceFilter,
      browser: browserFilter,
      location: locationFilter,
    })
  }
}
