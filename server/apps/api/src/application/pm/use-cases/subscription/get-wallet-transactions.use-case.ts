import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetWalletTransactionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    const transactions = await this.prisma.upward_pm_wallet_transaction.findMany({
      where: { pmId: pm.id },
      orderBy: { createdAt: 'desc' },
    });

    return transactions;
  }
}
