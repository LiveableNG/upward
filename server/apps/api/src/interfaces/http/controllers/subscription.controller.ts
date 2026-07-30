import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { UpwardSubscriptionTier, UpwardUnitBillingMode } from '@prisma/client';
import { GeneratePmDvaUseCase } from '../../../application/pm/use-cases/payments/generate-pm-dva.use-case';
import { GetOrCreateSubscriptionUseCase } from '../../../application/pm/use-cases/subscription/get-or-create-subscription.use-case';
import { GetOrCreateWalletUseCase } from '../../../application/pm/use-cases/subscription/get-or-create-wallet.use-case';
import { GetPmDvaUseCase } from '../../../application/pm/use-cases/subscription/get-pm-dva.use-case';
import { SelectSubscriptionTierUseCase } from '../../../application/pm/use-cases/subscription/select-subscription-tier.use-case';
import { TopUpWalletUseCase } from '../../../application/pm/use-cases/subscription/top-up-wallet.use-case';
import { GetWalletTransactionsUseCase } from '../../../application/pm/use-cases/subscription/get-wallet-transactions.use-case';

@Controller('pm')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly generatePmDvaUseCase: GeneratePmDvaUseCase,
    private readonly getOrCreateSubscriptionUseCase: GetOrCreateSubscriptionUseCase,
    private readonly getOrCreateWalletUseCase: GetOrCreateWalletUseCase,
    private readonly getPmDvaUseCase: GetPmDvaUseCase,
    private readonly selectSubscriptionTierUseCase: SelectSubscriptionTierUseCase,
    private readonly topUpWalletUseCase: TopUpWalletUseCase,
    private readonly getWalletTransactionsUseCase: GetWalletTransactionsUseCase,
  ) {}

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    return this.getOrCreateSubscriptionUseCase.execute(pmUuid);
  }

  @Get('wallet')
  async getWallet(@Req() req: any) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    return this.getOrCreateWalletUseCase.execute(pmUuid);
  }

  @Get('subscription/wallet/dva')
  async getWalletDva(@Req() req: any) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    const dva = await this.getPmDvaUseCase.execute(pmUuid);
    return { data: dva };
  }

  @Post('subscription/wallet/dva/generate')
  async generateWalletDva(@Req() req: any) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    const result = await this.generatePmDvaUseCase.execute(pmUuid);
    return { data: result };
  }

  @Post('subscription/select-tier')
  async selectTier(
    @Req() req: any,
    @Body() body: { tier: UpwardSubscriptionTier; billingMode?: UpwardUnitBillingMode },
  ) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    
    const { tier, billingMode = UpwardUnitBillingMode.ACTIVE } = body;
    return this.selectSubscriptionTierUseCase.execute(pmUuid, tier, billingMode);
  }

  @Post('wallet/top-up')
  async topUpWallet(@Req() req: any, @Body() body: { amount: number }) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    
    const { amount } = body;
    return this.topUpWalletUseCase.execute(pmUuid, amount);
  }

  @Get('wallet/transactions')
  async getWalletTransactions(@Req() req: any) {
    const pmUuid = req.user?.sub;
    if (!pmUuid) throw new BadRequestException('Property manager not found');
    return this.getWalletTransactionsUseCase.execute(pmUuid);
  }
}
