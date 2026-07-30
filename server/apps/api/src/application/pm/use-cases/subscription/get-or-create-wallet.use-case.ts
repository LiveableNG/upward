import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetOrCreateWalletUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
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
        data: {
          pmId: pm.id,
          balance: 0,
        },
      });
    }

    return wallet;
  }
}
