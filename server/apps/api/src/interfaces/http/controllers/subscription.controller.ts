import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SubscriptionService } from '../../../domains/subscription/subscription.service';
import { UpwardSubscriptionTier, UpwardUnitBillingMode } from '@prisma/client';

@Controller('pm')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private async getPm(req: any) {
    const uuid = req.user?.sub;
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid },
      include: { subscription: true, wallet: true },
    });
    if (!pm) throw new BadRequestException('Property manager not found');
    return pm;
  }

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const pm = await this.getPm(req);
    
    // Ensure subscription record is defaulted if not found
    let sub = pm.subscription;
    if (!sub) {
      sub = await this.prisma.upward_subscription.create({
        data: {
          pmId: pm.id,
          tier: UpwardSubscriptionTier.FREE,
          status: 'ACTIVE',
        },
      });
    }
    return sub;
  }

  @Get('wallet')
  async getWallet(@Req() req: any) {
    const pm = await this.getPm(req);
    
    // Ensure wallet is created if it does not exist
    let wallet = pm.wallet;
    if (!wallet) {
      wallet = await this.prisma.upward_pm_wallet.create({
        data: {
          pmId: pm.id,
          balance: 0,
        },
      });
    }
    return wallet;
  }

  @Post('subscription/select-tier')
  async selectTier(
    @Req() req: any,
    @Body() body: { tier: UpwardSubscriptionTier; billingMode?: UpwardUnitBillingMode },
  ) {
    const pm = await this.getPm(req);
    const { tier, billingMode = UpwardUnitBillingMode.ACTIVE } = body;

    const rate = tier === UpwardSubscriptionTier.TIER_2 ? 1500 : tier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0;
    
    // Count active units
    const unitCount = await this.prisma.upward_pm_unit.count({
      where: {
        property: { pmId: pm.id },
        status: billingMode === UpwardUnitBillingMode.ALL ? undefined : 'OCCUPIED',
      },
    });

    // Compute required deposit
    const minDeposit = unitCount === 0 ? 50000 : unitCount * rate * 6;

    let sub = pm.subscription;
    if (!sub) {
      sub = await this.prisma.upward_subscription.create({
        data: {
          pmId: pm.id,
          tier: UpwardSubscriptionTier.FREE,
        },
      });
    }

    // Check if initial deposit is required and if the wallet has sufficient balance
    let wallet = pm.wallet;
    if (!wallet) {
      wallet = await this.prisma.upward_pm_wallet.create({
        data: { pmId: pm.id, balance: 0 },
      });
    }

    if (tier !== UpwardSubscriptionTier.FREE && !sub.isInitialDepositPaid) {
      if (wallet.balance < minDeposit) {
        throw new BadRequestException({
          message: 'Insufficient wallet balance for initial deposit.',
          requiredDeposit: minDeposit,
          currentBalance: wallet.balance,
        });
      }

      // Deduct the initial deposit once
      await this.prisma.$transaction(async (tx) => {
        await tx.upward_pm_wallet.update({
          where: { id: wallet.id },
          data: { balance: wallet.balance - minDeposit },
        });

        await tx.upward_pm_wallet_transaction.create({
          data: {
            walletId: wallet.id,
            pmId: pm.id,
            type: 'DEDUCTION',
            amount: -minDeposit,
            reference: `INIT-DEP-${pm.id}-${Date.now()}`,
            narration: `Initial subscription deposit for ${tier}`,
          },
        });

        // Set permanent anniversary (capped at 28)
        const day = Math.min(new Date().getDate(), 28);

        sub = await tx.upward_subscription.update({
          where: { pmId: pm.id },
          data: {
            tier,
            unitBillingMode: billingMode,
            priceYearly: rate,
            priceMonthly: rate / 12,
            isInitialDepositPaid: true,
            anniversaryDate: day,
            status: 'ACTIVE',
          },
        });
      });
    } else {
      // Just update tier directly (or if downgrading)
      sub = await this.prisma.upward_subscription.update({
        where: { pmId: pm.id },
        data: {
          tier,
          unitBillingMode: billingMode,
          priceYearly: rate,
          priceMonthly: rate / 12,
        },
      });
    }

    return sub;
  }

  @Post('wallet/top-up')
  async topUpWallet(@Req() req: any, @Body() body: { amount: number }) {
    const pm = await this.getPm(req);
    const { amount } = body;
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let wallet = pm.wallet;
    if (!wallet) {
      wallet = await this.prisma.upward_pm_wallet.create({
        data: { pmId: pm.id, balance: 0 },
      });
    }

    // Top up the wallet and create transaction
    const updatedWallet = await this.prisma.$transaction(async (tx) => {
      const w = await tx.upward_pm_wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance + amount },
      });

      await tx.upward_pm_wallet_transaction.create({
        data: {
          walletId: wallet.id,
          pmId: pm.id,
          type: 'DEPOSIT',
          amount,
          reference: `TOPUP-${pm.id}-${Date.now()}`,
          narration: `Wallet top-up`,
        },
      });

      return w;
    });

    return updatedWallet;
  }
}
