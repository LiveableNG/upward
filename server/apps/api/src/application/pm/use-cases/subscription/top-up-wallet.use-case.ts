import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class TopUpWalletUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { wallet: true },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    let wallet = pm.wallet;
    if (!wallet) {
      wallet = await this.prisma.upward_pm_wallet.create({
        data: { pmId: pm.id, balance: 0 },
      });
    }

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
