import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  GetEarlyAccessStatsUseCase,
  GetEarlyAccessEntriesUseCase,
  DeleteEarlyAccessEntryUseCase,
} from '../../../application/use-cases/early-access/get-early-access-admin.use-case'

@Controller('admin/early-access')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class EarlyAccessAdminController {
  constructor(
    private readonly getEarlyAccessStatsUseCase: GetEarlyAccessStatsUseCase,
    private readonly getEarlyAccessEntriesUseCase: GetEarlyAccessEntriesUseCase,
    private readonly deleteEarlyAccessEntryUseCase: DeleteEarlyAccessEntryUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats() {
    const stats = await this.getEarlyAccessStatsUseCase.execute()
    return {
      success: true,
      data: stats,
    }
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getEntries(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 50

    const result = await this.getEarlyAccessEntriesUseCase.execute({
      page: pageNum,
      limit: limitNum,
      type,
      search,
    })

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    }
  }

  @Delete(':id')
  @Roles(AdminRole.DEVELOPER)
  async deleteEntry(@Param('id') id: string) {
    await this.deleteEarlyAccessEntryUseCase.execute(id)
    return {
      success: true,
      message: 'Early access record deleted successfully',
    }
  }
}
