import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
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
  UpdateUniversityApplicationStatusUseCase,
  DeleteUniversityApplicationUseCase,
} from '../../../application/use-cases/university-application/get-university-applications-admin.use-case'

@Controller('admin/university/applications')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityApplicationAdminController {
  constructor(
    private readonly getStatsUseCase: GetUniversityApplicationStatsUseCase,
    private readonly getApplicationsUseCase: GetUniversityApplicationsUseCase,
    private readonly updateStatusUseCase: UpdateUniversityApplicationStatusUseCase,
    private readonly deleteApplicationUseCase: DeleteUniversityApplicationUseCase,
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

  @Patch(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; feeStatus?: string; paymentRef?: string; notes?: string },
  ) {
    const updated = await this.updateStatusUseCase.execute({
      id,
      status: body.status,
      feeStatus: body.feeStatus,
      paymentRef: body.paymentRef,
      notes: body.notes,
    })

    return {
      success: true,
      message: 'Application status updated successfully',
      data: updated.toObject(),
    }
  }

  @Delete(':id')
  @Roles(AdminRole.DEVELOPER)
  async deleteApplication(@Param('id') id: string) {
    await this.deleteApplicationUseCase.execute(id)
    return {
      success: true,
      message: 'Application deleted successfully',
    }
  }
}
