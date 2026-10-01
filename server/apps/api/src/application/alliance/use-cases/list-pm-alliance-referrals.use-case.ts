import {
  Inject,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { ListAllianceReferralsQueryDto } from '../dtos/alliance-referral.dto';

@Injectable()
export class ListPmAllianceReferralsUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
  ) {}

  async execute(query: ListAllianceReferralsQueryDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // Verify requesting PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.referralRepo.findPmReferrals(pmId, {
      stage: query.stage,
      status: query.status,
      listingUuid: query.listingUuid,
      search: query.search,
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
