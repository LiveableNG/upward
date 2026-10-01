import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ALLIANCE_REFERRAL_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceReferralRepository,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PublicAllianceReferralContextDto } from '../dtos/alliance-public-marketplace.dto';

@Injectable()
export class ResolvePublicAllianceReferralUseCase {
  constructor(
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(shareToken: string): Promise<PublicAllianceReferralContextDto> {
    if (!shareToken || shareToken.trim().length === 0) {
      throw new BadRequestException('Share token is required');
    }

    const referral = await this.referralRepo.findByShareToken(shareToken.trim());
    if (!referral) {
      throw new NotFoundException('Referral link not found or has expired');
    }

    const listing = referral.listing;
    if (!listing || listing.status !== 'PUBLISHED' || listing.isSourceDeleted) {
      throw new NotFoundException('Referred listing is no longer available');
    }

    let pmRatingSummary = { averageScore: 0, totalRatings: 0 };
    if (referral.referringPmId) {
      try {
        const sum = await this.ratingRepo.getRatingSummaryForSubject('PM', referral.referringPmId);
        pmRatingSummary = { averageScore: sum.averageScore, totalRatings: sum.totalRatings };
      } catch {
        pmRatingSummary = { averageScore: 0, totalRatings: 0 };
      }
    }

    const sortedMedia = (listing.media || []).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const primary = sortedMedia[0] || null;

    const listingPmQualifications = ((listing.pm as any)?.qualifications || []).map((q: any) => ({
      code: q.qualification?.slug || q.code || '',
      title: q.qualification?.name || q.title || '',
      category: q.qualification?.description || q.category || '',
      badgeIcon: q.badgeIcon || null,
    }));

    const referringPmQualifications = ((referral.referringPm as any)?.qualifications || []).map((q: any) => ({
      code: q.qualification?.slug || q.code || '',
      title: q.qualification?.name || q.title || '',
      category: q.qualification?.description || q.category || '',
      badgeIcon: q.badgeIcon || null,
    }));

    const primaryMedia = primary
      ? {
          uuid: primary.uuid,
          publicUrl: await this.s3Service.getDownloadUrl(primary.storageKey || primary.publicUrl),
          mimeType: primary.mimeType,
          sortOrder: primary.sortOrder ?? 0,
        }
      : null;

    const signedMedia = await Promise.all(
      sortedMedia.map(async (m) => ({
        uuid: m.uuid,
        publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
        mimeType: m.mimeType,
        sortOrder: m.sortOrder ?? 0,
      })),
    );

    return {
      referralUuid: referral.uuid,
      shareToken: referral.shareToken,
      status: referral.status,
      clientName: referral.clientName,
      clientEmail: referral.clientEmail,
      clientPhone: referral.clientPhone,
      listing: {
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
        primaryMedia,
        mediaCount: sortedMedia.length,
        media: signedMedia,
        unitName: listing.targetUnit?.unitName || null,
        propertyName: listing.targetProperty?.name || listing.targetUnit?.property?.name || null,
        pm: {
          uuid: listing.pm?.uuid || '',
          displayName: listing.pm?.companyName || listing.pm?.name || 'Property Manager',
          companyName: listing.pm?.companyName,
          pmTitle: (listing.pm as any)?.allianceProfile?.pmTitle || null,
          bio: (listing.pm as any)?.allianceProfile?.bio || null,
          qualifications: listingPmQualifications,
        },
        ratingSummary: pmRatingSummary,
        publishedAt: listing.publishedAt,
      },
      referringPm: {
        uuid: referral.referringPm?.uuid || '',
        displayName: referral.referringPm?.companyName || referral.referringPm?.name || 'Referring PM',
        companyName: referral.referringPm?.companyName,
        pmTitle: (referral.referringPm as any)?.allianceProfile?.pmTitle || null,
        bio: (referral.referringPm as any)?.allianceProfile?.bio || null,
        qualifications: referringPmQualifications,
      },
    };
  }
}
