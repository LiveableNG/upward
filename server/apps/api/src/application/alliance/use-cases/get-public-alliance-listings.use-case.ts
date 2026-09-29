import { Inject, Injectable } from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceListingRepository,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import {
  PublicAllianceMarketplaceQueryDto,
  PublicAllianceListingCardDto,
} from '../dtos/alliance-public-marketplace.dto';

@Injectable()
export class GetPublicAllianceListingsUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(query: PublicAllianceMarketplaceQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.listingRepo.findPublicMarketplaceListings({
      intent: query.intent,
      targetType: query.targetType,
      propertyType: query.propertyType,
      city: query.city,
      state: query.state,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      bedrooms: query.bedrooms,
      bathrooms: query.bathrooms,
      search: query.search,
      sortBy: query.sortBy,
      skip,
      take: limit,
    });

    const cards: PublicAllianceListingCardDto[] = await Promise.all(
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

        const sortedMedia = (item.media || []).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        );
        const primary = sortedMedia[0] || null;

        const pmQualifications = ((item.pm as any)?.qualifications || []).map((q: any) => ({
          code: q.qualification?.slug || q.code || '',
          title: q.qualification?.name || q.title || '',
          category: q.qualification?.description || q.category || '',
          badgeIcon: q.badgeIcon || null,
        }));

        const primaryMedia = primary
          ? {
              uuid: primary.uuid,
              publicUrl:
                primary.publicUrl &&
                (primary.publicUrl.startsWith('http://') || primary.publicUrl.startsWith('https://'))
                  ? primary.publicUrl
                  : await this.s3Service.getDownloadUrl(primary.storageKey || primary.publicUrl),
              mimeType: primary.mimeType,
              sortOrder: primary.sortOrder ?? 0,
            }
          : null;

        return {
          uuid: item.uuid,
          title: item.title,
          description: item.description,
          intent: item.intent,
          targetType: item.targetType,
          price: item.price,
          currency: item.currency || 'NGN',
          propertyType: item.propertyType,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          address: item.address,
          city: item.city,
          state: item.state,
          country: item.country || 'Nigeria',
          primaryMedia,
          mediaCount: item.media ? item.media.length : 0,
          pm: {
            uuid: item.pm?.uuid || '',
            displayName: item.pm?.companyName || item.pm?.name || 'Property Manager',
            companyName: item.pm?.companyName,
            pmTitle: item.pm?.allianceProfile?.pmTitle || null,
            bio: item.pm?.allianceProfile?.bio || null,
            qualifications: pmQualifications,
          },
          ratingSummary,
          publishedAt: item.publishedAt,
        };
      }),
    );

    return {
      items: cards,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
