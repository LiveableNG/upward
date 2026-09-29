import {
  Inject,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { DiscoverAllianceListingsQueryDto } from '../dtos/alliance-listing.dto';

@Injectable()
export class DiscoverAllianceListingsUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
  ) {}

  async execute(query: DiscoverAllianceListingsQueryDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // Verify requesting actor's PM has Alliance access enabled
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.listingRepo.findDiscoverableListings(pmId, {
      search: query.search,
      intent: query.intent,
      targetType: query.targetType,
      propertyType: query.propertyType,
      state: query.state,
      city: query.city,
      sortBy: query.sortBy,
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
