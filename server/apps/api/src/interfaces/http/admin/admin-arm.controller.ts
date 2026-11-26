import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
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
  GetAdminArmCustomerDocumentUseCase,
} from '../../../application/use-cases/admin/admin-arm.use-cases'
import {
  GetAdminSavingsLedgerUseCase,
  SimulateDailyNavAccrualUseCase,
} from '../../../application/use-cases/admin/admin-savings-ledger.use-case'
import { GetAdminInsuranceLedgerUseCase } from '../../../application/use-cases/admin/admin-insurance-ledger.use-case'
import {
  CreditSavingsCashbackDto,
  CreditSavingsCashbackUseCase,
  GetSavingsCashbackOverviewUseCase,
  UpsertCashbackCampaignDto,
  UpsertSavingsCashbackCampaignUseCase,
} from '../../../application/use-cases/admin/admin-savings-cashback.use-cases'

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
    private readonly getCustomerDocUseCase: GetAdminArmCustomerDocumentUseCase,
    private readonly getSavingsLedgerUseCase: GetAdminSavingsLedgerUseCase,
    private readonly simulateDailyNavAccrualUseCase: SimulateDailyNavAccrualUseCase,
    private readonly getInsuranceLedgerUseCase: GetAdminInsuranceLedgerUseCase,
    private readonly getCashbackOverviewUseCase: GetSavingsCashbackOverviewUseCase,
    private readonly upsertCashbackCampaignUseCase: UpsertSavingsCashbackCampaignUseCase,
    private readonly creditCashbackUseCase: CreditSavingsCashbackUseCase,
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

  @Get('customers/:userUuid/consent-document')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getCustomerConsentDocument(
    @Param('userUuid') userUuid: string,
    @Res({ passthrough: true }) res: any,
  ) {
    return this.getCustomerDocUseCase.execute(userUuid, 'consent', res)
  }

  @Get('customers/:userUuid/kyc-document/:kind')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getCustomerKycDocument(
    @Param('userUuid') userUuid: string,
    @Param('kind') kind: 'id_card' | 'utility_bill',
    @Res({ passthrough: true }) res: any,
  ) {
    return this.getCustomerDocUseCase.execute(userUuid, kind, res)
  }

  @Get('internal-ledger')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async getInternalLedger(
    @Query('productOption') productOption?: string,
    @Query('search') search?: string,
  ) {
    return this.getSavingsLedgerUseCase.execute({ productOption, search })
  }

  @Get('insurance-ledger')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getInsuranceLedger(
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.getInsuranceLedgerUseCase.execute({ source, status, search })
  }

  @Post('simulate-accrual')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async simulateDailyAccrual(@Body() body: { days?: number; vaultUuid?: string }) {
    return this.simulateDailyNavAccrualUseCase.execute(body)
  }

  @Get('cashback')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getCashbackOverview(@Query('campaignCode') campaignCode?: string) {
    return this.getCashbackOverviewUseCase.execute(campaignCode)
  }

  @Post('cashback/campaign')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async upsertCashbackCampaign(
    @Body() dto: UpsertCashbackCampaignDto,
    @Req() req: any,
  ) {
    return this.upsertCashbackCampaignUseCase.execute(
      dto,
      req.user?.id || req.user?.sub,
    )
  }

  @Post('cashback/credit')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async creditCashback(@Body() dto: CreditSavingsCashbackDto, @Req() req: any) {
    return this.creditCashbackUseCase.execute(dto, req.user?.id || req.user?.sub)
  }
}
