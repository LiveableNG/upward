import {
  Controller,
  Get,
  Param,
  Post,
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
  GetArmJobsUseCase,
  RetryArmJobUseCase,
  GetArmTransactionLiveStatusUseCase,
} from '../../../application/use-cases/admin/admin-arm.use-cases'

@Controller('admin/arm')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminArmController {
  constructor(
    private readonly getStatsUseCase: GetArmPortfolioStatsUseCase,
    private readonly getCustomersUseCase: GetArmCustomersUseCase,
    private readonly getTransactionsUseCase: GetArmTransactionsUseCase,
    private readonly getJobsUseCase: GetArmJobsUseCase,
    private readonly retryJobUseCase: RetryArmJobUseCase,
    private readonly getTxLiveStatusUseCase: GetArmTransactionLiveStatusUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats(@Query('refresh') refresh?: string) {
    return this.getStatsUseCase.execute(refresh === 'true')
  }

  @Get('customers')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getCustomers(@Query('refresh') refresh?: string) {
    return this.getCustomersUseCase.execute(refresh === 'true')
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

  @Get('transactions/:uuid/arm-status')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getTransactionLiveArmStatus(@Param('uuid') uuid: string) {
    return this.getTxLiveStatusUseCase.execute(uuid)
  }

  @Get('jobs')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getJobs(
    @Query('status') status?: string,
    @Query('jobType') jobType?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.getJobsUseCase.execute({
      status,
      jobType,
      search,
      page,
      limit,
    })
  }

  @Post('jobs/:id/retry')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async retryJob(@Param('id') id: string) {
    return this.retryJobUseCase.execute(id)
  }
}
