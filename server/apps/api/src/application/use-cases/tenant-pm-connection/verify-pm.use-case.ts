import { Inject, Injectable } from '@nestjs/common';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class VerifyPmEmailUseCase {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(identifier: string) {
    let pm = await this.pmRepository.findByEmail(identifier);

    if (!pm) {
      pm = await this.pmRepository.findByPhone(identifier);
    }

    if (!pm) {
      return { found: false };
    }

    // Resolve primary settlement account
    let defaultSettlementAccount = null;
    if (pm.id) {
      const settlementAcc = await (this.prisma as any).upward_settlement_account.findFirst({
        where: { pmId: pm.id, isPrimary: true },
        include: { manualAccount: true },
      }) || await (this.prisma as any).upward_settlement_account.findFirst({
        where: { pmId: pm.id },
        include: { manualAccount: true },
      });

      if (settlementAcc?.manualAccount) {
        defaultSettlementAccount = {
          id: settlementAcc.id,
          bankName: settlementAcc.manualAccount.bankName,
          accountNumber: settlementAcc.manualAccount.accountNumber,
          accountName: settlementAcc.manualAccount.accountName,
          bankCode: settlementAcc.manualAccount.bankCode,
          title: settlementAcc.title,
          isPrimary: settlementAcc.isPrimary,
        };
      } else if (pm.accountNumber && pm.bankName) {
        defaultSettlementAccount = {
          bankName: pm.bankName,
          accountNumber: pm.accountNumber,
          accountName: pm.businessName || `${pm.firstName} ${pm.lastName}`,
          bankCode: pm.bankCode || null,
          title: 'Settlement Account',
          isPrimary: true,
        };
      }
    }

    return {
      found: true,
      pm: {
        id: pm.id,
        uuid: pm.uuid,
        firstName: pm.firstName,
        lastName: pm.lastName,
        businessName: pm.businessName,
        email: pm.email,
        phone: pm.phone,
        defaultSettlementAccount,
      },
    };
  }
}

