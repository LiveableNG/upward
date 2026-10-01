import {
  Inject,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceRatingRepository,
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
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
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

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let ratingSummary = { averageScore: 0, totalRatings: 0 };
        if (item.pmId) {
          try {
            const sum = await this.ratingRepo.getRatingSummaryForSubject('PM', item.pmId);
            ratingSummary = { averageScore: sum.averageScore, totalRatings: sum.totalRatings };
          } catch {
            ratingSummary = { averageScore: 0, totalRatings: 0 };
          }
        }

        let media = item.media || [];
        if (media.length > 0) {
          media = await Promise.all(
            media.map(async (m) => ({
              ...m,
              publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
            })),
          );
        }

        const sortedMedia = [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const primary = sortedMedia[0] || null;
        const primaryMedia = primary
          ? {
              uuid: primary.uuid,
              publicUrl: primary.publicUrl,
              mimeType: primary.mimeType,
              sortOrder: primary.sortOrder ?? 0,
            }
          : null;

        return {
          ...item,
          pm: item.pm
            ? {
                ...item.pm,
                ratingSummary,
              }
            : item.pm,
          primaryMedia,
          mediaCount: sortedMedia.length,
          media: sortedMedia,
          ratingSummary,
        };
      }),
    );

    return {
      items: enrichedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
