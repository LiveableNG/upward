import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SETTLEMENT_ACCOUNT_REPOSITORY,
  ISettlementAccountRepository,
  SettlementAccountEntity,
} from '../../../../domains/pm/ISettlementAccountRepository';
import {
  PROPERTY_MANAGER_REPOSITORY,
  PropertyManagerRepository,
} from '../../../../domains/pm/property-manager.repository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class GetSettlementAccountsUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
  ) {}

  async execute(pmId: number, actor?: PmActorContext): Promise<SettlementAccountEntity[]> {
    const pm = await this.pmRepo.findById(pmId);
    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    let accounts = await this.accountRepo.findByPmId(pmId);

    // Auto-seed primary account if PM has legacy bank info and no manual accounts exist yet
    if (accounts.length === 0 && pm.accountNumber && pm.bankName) {
      const primaryAccount = await this.accountRepo.create({
        accountNumber: pm.accountNumber,
        accountName: pm.accountName || pm.businessName || `${pm.firstName} ${pm.lastName}`.trim(),
        bankName: pm.bankName,
        bankCode: pm.bankCode || undefined,
        pmId: pm.id!,
        isPrimary: true,
      });
      accounts = [primaryAccount];
    }

    return accounts;
  }
}
