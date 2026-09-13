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
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class SetDefaultSettlementAccountUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
  ) {}

  async execute(
    accountUuid: string,
    pmId: number,
    actor?: PmActorContext,
  ): Promise<SettlementAccountEntity> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only organization administrators can set default settlement accounts');
    }

    const account = await this.accountRepo.findByUuid(accountUuid);
    if (!account || account.pmId !== pmId) {
      throw new NotFoundException('Settlement account not found');
    }

    return this.accountRepo.setPrimary(account.id, pmId);
  }
}
