import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_COMMISSION_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceCommissionRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

@Injectable()
export class GetAllianceCommissionDetailUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IAllianceCommissionRepository,
  ) {}

  async execute(commissionUuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    // 2. Fetch commission
    const commission = await this.commissionRepo.findByUuid(commissionUuid);
    if (!commission) {
      throw new NotFoundException('Alliance commission not found');
    }

    // 3. Verify referring PM authorization (strict privacy)
    if (commission.referringPmId !== pmId) {
      throw new ForbiddenException('You do not have permission to view this commission record');
    }

    return commission;
  }
}
