import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
import { CreateSettlementAccountDto } from './dtos/settlement-account.dto';

@Injectable()
export class CreateSettlementAccountUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
  ) {}

  async execute(
    pmId: number,
    dto: CreateSettlementAccountDto,
    actor?: PmActorContext,
  ): Promise<SettlementAccountEntity> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only organization administrators can add settlement accounts');
    }

    const pm = await this.pmRepo.findById(pmId);
    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    const existingAccounts = await this.accountRepo.findByPmId(pmId);
    const isFirstAccount = existingAccounts.length === 0;
    const shouldBePrimary = Boolean(dto.isPrimary || isFirstAccount);

    if (shouldBePrimary && existingAccounts.length > 0) {
      // Create and set primary
      const account = await this.accountRepo.create({
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        pmId: pm.id!,
        isPrimary: false,
      });

      return this.accountRepo.setPrimary(account.id, pm.id!);
    }

    const account = await this.accountRepo.create({
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      bankName: dto.bankName,
      bankCode: dto.bankCode,
      pmId: pm.id!,
      isPrimary: shouldBePrimary,
    });

    if (shouldBePrimary) {
      await this.pmRepo.update(pm.id!, {
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
      });
    }

    return account;
  }
}
