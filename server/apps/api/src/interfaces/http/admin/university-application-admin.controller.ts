import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetUniversityApplicationStatsUseCase,
  GetUniversityApplicationsUseCase,
} from '../../../application/use-cases/university-application/get-university-applications-admin.use-case'

@Controller('admin/university/applications')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityApplicationAdminController {
  constructor(
    private readonly getStatsUseCase: GetUniversityApplicationStatsUseCase,
    private readonly getApplicationsUseCase: GetUniversityApplicationsUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats() {
    const stats = await this.getStatsUseCase.execute()
    return {
      success: true,
      data: stats,
    }
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('feeStatus') feeStatus?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 50

    const result = await this.getApplicationsUseCase.execute({
      page: pageNum,
      limit: limitNum,
      status,
      feeStatus,
      search,
    })

    return {
      success: true,
      data: result.data.map(app => app.toObject()),
      meta: result.meta,
    }
  }
}
