import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@upward/shared-types';
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../../application/auth/guards/roles.guard';
import { Roles } from '../../../application/auth/decorators/roles.decorator';
import {
  GetSettlementStatsUseCase,
  GetSettlementBatchesUseCase,
  GetFlaggedSettlementsUseCase,
  GetSettlementTransactionsUseCase,
  ResolveFlaggedSettlementUseCase,
  ResolveFlaggedSettlementDto,
} from '../../../application/use-cases/admin/admin-settlements.use-cases';

@Controller('admin/settlements')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminSettlementsController {
  constructor(
    private readonly getSettlementStatsUseCase: GetSettlementStatsUseCase,
    private readonly getSettlementBatchesUseCase: GetSettlementBatchesUseCase,
    private readonly getFlaggedSettlementsUseCase: GetFlaggedSettlementsUseCase,
    private readonly getSettlementTransactionsUseCase: GetSettlementTransactionsUseCase,
    private readonly resolveFlaggedSettlementUseCase: ResolveFlaggedSettlementUseCase,
  ) {}

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getStats() {
    return this.getSettlementStatsUseCase.execute();
  }

  @Get('flagged')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFlagged() {
    return this.getFlaggedSettlementsUseCase.execute();
  }

  @Get('batches')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getBatches(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.getSettlementBatchesUseCase.execute(page, limit);
  }

  @Get('transactions')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.getSettlementTransactionsUseCase.execute({ page, limit, status, search });
  }

  @Post('resolve-flagged')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async resolveFlagged(@Body() dto: ResolveFlaggedSettlementDto) {
    return this.resolveFlaggedSettlementUseCase.execute(dto);
  }
}
