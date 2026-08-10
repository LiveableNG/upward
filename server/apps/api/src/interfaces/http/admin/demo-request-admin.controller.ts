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
import { GetDemoRequestsUseCase } from '../../../application/use-cases/admin/get-demo-requests.use-case'
import { UpdateDemoRequestStatusUseCase } from '../../../application/use-cases/admin/update-demo-request-status.use-case'
import { UpdateDemoRequestStatusDto } from '../dto/update-demo-request-status.dto'

@Controller('admin/demo-requests')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class DemoRequestAdminController {
  constructor(
    private readonly getDemoRequestsUseCase: GetDemoRequestsUseCase,
    private readonly updateDemoRequestStatusUseCase: UpdateDemoRequestStatusUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getDemoRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.getDemoRequestsUseCase.execute({
      page,
      limit,
      status,
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
    @Body() dto: UpdateDemoRequestStatusDto,
  ) {
    const demoRequestId = parseInt(id, 10)
    const demoRequest = await this.updateDemoRequestStatusUseCase.execute(
      demoRequestId,
      dto.status,
    )
    return {
      success: true,
      data: demoRequest,
      message: 'Demo request status updated successfully',
    }
  }
}
