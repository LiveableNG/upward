import {
  Controller,
  Get,
  Patch,
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
import { GetAdminHomeRequestsUseCase } from '../../../application/use-cases/admin/get-admin-home-requests.use-case'
import { UpdateAdminHomeRequestStatusUseCase } from '../../../application/use-cases/admin/update-admin-home-request-status.use-case'
import { UpdateHomeRequestStatusDto } from '../dto/update-home-request-status.dto'

@Controller('admin/home-requests')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class HomeRequestAdminController {
  constructor(
    private readonly getAdminHomeRequestsUseCase: GetAdminHomeRequestsUseCase,
    private readonly updateAdminHomeRequestStatusUseCase: UpdateAdminHomeRequestStatusUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getHomeRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('requestType') requestType?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.getAdminHomeRequestsUseCase.execute({
      page,
      limit,
      status,
      requestType,
      search,
    })
    return {
      success: true,
      data: result.items,
      meta: result.meta,
    }
  }

  @Patch(':id/status')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateHomeRequestStatusDto,
  ) {
    const homeRequestId = parseInt(id, 10)
    const homeRequest = await this.updateAdminHomeRequestStatusUseCase.execute(
      homeRequestId,
      dto.status,
    )
    return {
      success: true,
      data: homeRequest,
      message: 'Home request status updated successfully',
    }
  }
}
