import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { GetUniversityHireRequestsAdminUseCase } from '../../../application/use-cases/university-hire-request/get-university-hire-requests-admin.use-case'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'

@Controller('admin/university/hire-requests')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityHireAdminController {
  constructor(
    private readonly getHireRequestsUseCase: GetUniversityHireRequestsAdminUseCase,
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
}
