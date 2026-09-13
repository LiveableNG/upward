import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import { UpdateSettlementAccountDto } from './dtos/settlement-account.dto';

@Injectable()
export class UpdateSettlementAccountUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
  ) {}

  async execute(
    accountUuid: string,
    pmId: number,
    dto: UpdateSettlementAccountDto,
    actor?: PmActorContext,
  ): Promise<SettlementAccountEntity> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only organization administrators can update settlement accounts');
    }

    const account = await this.accountRepo.findByUuid(accountUuid);
    if (!account || account.pmId !== pmId) {
      throw new NotFoundException('Settlement account not found');
    }

    const updated = await this.accountRepo.update(account.id, dto);

    if (updated.isPrimary) {
      await this.pmRepo.update(pmId, {
        bankName: updated.bankName,
        bankCode: updated.bankCode || undefined,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
      });
    }

    return updated;
  }
}
