import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetDevEmailsAdminUseCase } from '../../../application/use-cases/admin/dev-email/get-dev-emails.use-case'
import { GetDevEmailDetailsAdminUseCase } from '../../../application/use-cases/admin/dev-email/get-dev-email-details.use-case'
import { ClearDevEmailsAdminUseCase } from '../../../application/use-cases/admin/dev-email/clear-dev-emails.use-case'

@Controller('admin/dev-emails')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class DevEmailAdminController {
  constructor(
    private readonly getDevEmailsUseCase: GetDevEmailsAdminUseCase,
    private readonly getDevEmailDetailsUseCase: GetDevEmailDetailsAdminUseCase,
    private readonly clearDevEmailsUseCase: ClearDevEmailsAdminUseCase,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getDevEmails(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.getDevEmailsUseCase.execute({ page, limit, search })
  }

  @Get(':uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getDevEmailDetails(@Param('uuid') uuid: string) {
    return this.getDevEmailDetailsUseCase.execute(uuid)
  }

  @Delete()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async clearAllDevEmails() {
    return this.clearDevEmailsUseCase.execute()
  }
}
