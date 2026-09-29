import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

@Injectable()
export class GetAllianceReferralDetailUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
  ) {}

  async execute(uuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // Verify requesting PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const referral = await this.referralRepo.findByUuid(uuid);
    if (!referral) {
      throw new NotFoundException('Alliance referral not found');
    }

    // Ownership check: Only referring PM (and their authorized employees) can view the referral details
    if (referral.referringPmId !== pmId) {
      throw new ForbiddenException('You do not have permission to access this referral');
    }

    return referral;
  }
}
