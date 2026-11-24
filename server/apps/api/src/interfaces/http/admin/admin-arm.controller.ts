import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminRole } from '@upward/shared-types'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import {
  GetArmPortfolioStatsUseCase,
  GetArmCustomersUseCase,
  GetArmTransactionsUseCase,
} from '../../../application/use-cases/admin/admin-arm.use-cases'

@Controller('admin/arm')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminArmController {
  constructor(
    private readonly getStatsUseCase: GetArmPortfolioStatsUseCase,
    private readonly getCustomersUseCase: GetArmCustomersUseCase,
    private readonly getTransactionsUseCase: GetArmTransactionsUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats() {
    return this.getStatsUseCase.execute()
  }

  @Get('customers')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getCustomers() {
    return this.getCustomersUseCase.execute()
  }

  @Get('transactions')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getTransactions(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('vaultUuid') vaultUuid?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.getTransactionsUseCase.execute({
      type,
      search,
      vaultUuid,
      page,
      limit,
    })
  }
}
