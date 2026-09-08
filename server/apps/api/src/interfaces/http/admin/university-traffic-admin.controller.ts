import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetUniversityTrafficSourcesAdminUseCase,
  GetUniversityTrafficStatsAdminUseCase,
  GetUniversitySourceVisitsAdminUseCase,
} from '../../../application/use-cases/university-traffic/get-university-traffic-sources-admin.use-case'
import { CreateUniversityTrafficSourceUseCase } from '../../../application/use-cases/university-traffic/create-university-traffic-source.use-case'
import {
  UpdateUniversityTrafficSourceUseCase,
  DeleteUniversityTrafficSourceUseCase,
} from '../../../application/use-cases/university-traffic/update-university-traffic-source.use-case'
import {
  CreateUniversityTrafficSourceDto,
  UpdateUniversityTrafficSourceDto,
} from '../dto/create-university-traffic-source.dto'

@Controller('admin/university/traffic')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class UniversityTrafficAdminController {
  constructor(
    private readonly getSourcesUseCase: GetUniversityTrafficSourcesAdminUseCase,
    private readonly getStatsUseCase: GetUniversityTrafficStatsAdminUseCase,
    private readonly getVisitsUseCase: GetUniversitySourceVisitsAdminUseCase,
    private readonly createSourceUseCase: CreateUniversityTrafficSourceUseCase,
    private readonly updateSourceUseCase: UpdateUniversityTrafficSourceUseCase,
    private readonly deleteSourceUseCase: DeleteUniversityTrafficSourceUseCase,
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

  @Get('sources')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getSources(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('channel') channel?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 50
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined

    const result = await this.getSourcesUseCase.execute({
      page: pageNum,
      limit: limitNum,
      search,
      channel,
      isActive: activeBool,
    })

    return {
      success: true,
      data: result.data.map(s => s.toObject()),
      meta: result.meta,
    }
  }

  @Post('sources')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createSource(@Body() dto: CreateUniversityTrafficSourceDto) {
    const source = await this.createSourceUseCase.execute(dto)
    return {
      success: true,
      message: 'Tracking source created successfully',
      data: source.toObject(),
    }
  }

  @Patch('sources/:id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateSource(
    @Param('id') id: string,
    @Body() dto: UpdateUniversityTrafficSourceDto,
  ) {
    const updated = await this.updateSourceUseCase.execute(id, dto)
    return {
      success: true,
      message: 'Tracking source updated successfully',
      data: updated.toObject(),
    }
  }

  @Delete('sources/:id')
  @Roles(AdminRole.DEVELOPER)
  async deleteSource(@Param('id') id: string) {
    await this.deleteSourceUseCase.execute(id)
    return {
      success: true,
      message: 'Tracking source deleted successfully',
    }
  }

  @Get('sources/:id/visits')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getVisits(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50
    const visits = await this.getVisitsUseCase.execute(id, limitNum)
    return {
      success: true,
      data: visits.map(v => v.toObject()),
    }
  }
}
