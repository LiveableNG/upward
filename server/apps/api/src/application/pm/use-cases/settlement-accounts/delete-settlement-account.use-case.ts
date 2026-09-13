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
} from '../../../../domains/pm/ISettlementAccountRepository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class DeleteSettlementAccountUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
  ) {}

  async execute(
    accountUuid: string,
    pmId: number,
    actor?: PmActorContext,
  ): Promise<{ success: boolean }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only organization administrators can delete settlement accounts');
    }

    const account = await this.accountRepo.findByUuid(accountUuid);
    if (!account || account.pmId !== pmId) {
      throw new NotFoundException('Settlement account not found');
    }

    if (account.isPrimary) {
      throw new BadRequestException('Cannot delete the default settlement account. Set another account as default first.');
    }

    await this.accountRepo.delete(account.id);
    return { success: true };
  }
}
