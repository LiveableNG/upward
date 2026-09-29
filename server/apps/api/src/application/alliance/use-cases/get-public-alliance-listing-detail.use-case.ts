import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceListingRepository,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PublicAllianceListingDetailDto } from '../dtos/alliance-public-marketplace.dto';

@Injectable()
export class GetPublicAllianceListingDetailUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
  ) {}

  async execute(listingUuid: string): Promise<PublicAllianceListingDetailDto> {
    const listing = await this.listingRepo.findPublicByUuid(listingUuid);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found or is no longer available');
    }

    let ratingSummary = { averageScore: 0, totalRatings: 0 };
    if (listing.pmId) {
      try {
        const sum = await this.ratingRepo.getRatingSummaryForSubject('PM', listing.pmId);
        ratingSummary = { averageScore: sum.averageScore, totalRatings: sum.totalRatings };
      } catch {
        ratingSummary = { averageScore: 0, totalRatings: 0 };
      }
    }

    const sortedMedia = (listing.media || []).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const primary = sortedMedia[0] || null;

    const pmQualifications = ((listing.pm as any)?.qualifications || []).map((q: any) => ({
      code: q.qualification?.slug || q.code || '',
      title: q.qualification?.name || q.title || '',
      category: q.qualification?.description || q.category || '',
      badgeIcon: q.badgeIcon || null,
    }));

    return {
      uuid: listing.uuid,
      title: listing.title,
      description: listing.description,
      intent: listing.intent,
      targetType: listing.targetType,
      price: listing.price,
      currency: listing.currency || 'NGN',
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      address: listing.address,
      city: listing.city,
      state: listing.state,
      country: listing.country || 'Nigeria',
      primaryMedia: primary
        ? {
            uuid: primary.uuid,
            publicUrl: primary.publicUrl,
            mimeType: primary.mimeType,
            sortOrder: primary.sortOrder ?? 0,
          }
        : null,
      mediaCount: sortedMedia.length,
      media: sortedMedia.map((m) => ({
        uuid: m.uuid,
        publicUrl: m.publicUrl,
        mimeType: m.mimeType,
        sortOrder: m.sortOrder ?? 0,
      })),
      unitName: listing.targetUnit?.unitName || null,
      propertyName: listing.targetProperty?.name || listing.targetUnit?.property?.name || null,
      pm: {
        uuid: listing.pm?.uuid || '',
        displayName: listing.pm?.companyName || listing.pm?.name || 'Property Manager',
        companyName: listing.pm?.companyName,
        pmTitle: listing.pm?.allianceProfile?.pmTitle || null,
        bio: listing.pm?.allianceProfile?.bio || null,
        qualifications: pmQualifications,
      },
      ratingSummary,
      publishedAt: listing.publishedAt,
    };
  }
}
