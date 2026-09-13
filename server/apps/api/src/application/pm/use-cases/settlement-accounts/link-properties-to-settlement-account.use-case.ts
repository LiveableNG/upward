import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SETTLEMENT_ACCOUNT_REPOSITORY,
  ISettlementAccountRepository,
} from '../../../../domains/pm/ISettlementAccountRepository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';
import { LinkPropertiesDto } from './dtos/settlement-account.dto';

@Injectable()
export class LinkPropertiesToSettlementAccountUseCase {
  constructor(
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
  ) {}

  async execute(
    accountUuid: string,
    pmId: number,
    dto: LinkPropertiesDto,
    actor?: PmActorContext,
  ): Promise<{ success: boolean }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only organization administrators can link properties to settlement accounts');
    }

    const account = await this.accountRepo.findByUuid(accountUuid);
    if (!account || account.pmId !== pmId) {
      throw new NotFoundException('Settlement account not found');
    }

    await this.accountRepo.linkProperties(account.id, pmId, dto.propertyUuids);
    return { success: true };
  }
}
