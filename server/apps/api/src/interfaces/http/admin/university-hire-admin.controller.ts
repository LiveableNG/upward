import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { GetUniversityHireRequestsAdminUseCase } from '../../../application/use-cases/university-hire-request/get-university-hire-requests-admin.use-case'
import { UpdateUniversityHireRequestAdminUseCase } from '../../../application/use-cases/university-hire-request/update-university-hire-request-admin.use-case'
import { DeleteUniversityHireRequestAdminUseCase } from '../../../application/use-cases/university-hire-request/delete-university-hire-request-admin.use-case'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'

@Controller('admin/university/hire-requests')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityHireAdminController {
  constructor(
    private readonly getHireRequestsUseCase: GetUniversityHireRequestsAdminUseCase,
    private readonly updateHireRequestUseCase: UpdateUniversityHireRequestAdminUseCase,
    private readonly deleteHireRequestUseCase: DeleteUniversityHireRequestAdminUseCase,
  ) {}

  @Get()
  async getHireRequests(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('placementType') placementType?: string,
  ) {
    const result = await this.getHireRequestsUseCase.execute({
      page,
      limit,
      search,
      status,
      industry,
      placementType,
    })

    return {
      success: true,
      ...result,
    }
  }

  @Patch(':id')
  async updateHireRequest(
    @Param('id') id: string,
    @Body() body: { status?: string; notes?: string },
  ) {
    const updated = await this.updateHireRequestUseCase.execute({
      id,
      status: body.status,
      notes: body.notes,
    })

    return {
      success: true,
      data: updated,
    }
  }

  @Delete(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async deleteHireRequest(@Param('id') id: string) {
    await this.deleteHireRequestUseCase.execute({ id })

    return {
      success: true,
      message: 'Hire request deleted successfully',
    }
  }
}
