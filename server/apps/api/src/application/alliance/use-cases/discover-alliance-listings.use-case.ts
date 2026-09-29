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
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { DiscoverAllianceListingsQueryDto } from '../dtos/alliance-listing.dto';

@Injectable()
export class DiscoverAllianceListingsUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly s3Service: S3Service,
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

    const signedItems = await Promise.all(
      items.map(async (item) => {
        if (item.media && item.media.length > 0) {
          const signedMedia = await Promise.all(
            item.media.map(async (m) => ({
              ...m,
              publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
            })),
          );
          return { ...item, media: signedMedia };
        }
        return item;
      }),
    );

    return {
      items: signedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
