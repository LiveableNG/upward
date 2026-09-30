import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ALLIANCE_REFERRAL_REPOSITORY,
  IAllianceReferralRepository,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import {
  AllianceLeadStage,
  AllianceReferralStatus,
} from '../../../domains/alliance/alliance.entity';

export interface UserAllianceJourneyStageItem {
  key: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface UserAllianceJourneyDto {
  referralUuid: string;
  shareToken: string;
  status: AllianceReferralStatus;
  stage: AllianceLeadStage;
  stageIndex: number;
  stageLabel: string;
  stageDescription: string;
  stages: UserAllianceJourneyStageItem[];
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date | null;
  listing: {
    uuid: string;
    title: string;
    description?: string | null;
    price: number;
    currency: string;
    intent: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    propertyType?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    media: Array<{
      uuid: string;
      publicUrl: string;
      sortOrder: number;
    }>;
  };
  referringPm: {
    uuid?: string;
    displayName: string;
    companyName?: string | null;
  };
  listingPm?: {
    uuid?: string;
    displayName: string;
    companyName?: string | null;
  };
  hasRated: boolean;
}

const STAGE_ORDER: AllianceLeadStage[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'VIEWING',
  'APPLICATION',
  'CONVERTED',
];

const STAGE_META: Record<AllianceLeadStage, { label: string; desc: string }> = {
  NEW: {
    label: 'Recommendation Received',
    desc: 'Property recommended by your partner agent / inquiry placed.',
  },
  CONTACTED: {
    label: 'Manager Contacted',
    desc: 'The property manager has received your details and initiated contact.',
  },
  INTERESTED: {
    label: 'Interest Confirmed',
    desc: 'Interest confirmed. Preparing property viewing details.',
  },
  VIEWING: {
    label: 'Viewing / Inspection',
    desc: 'Physical or virtual inspection scheduled with the manager.',
  },
  APPLICATION: {
    label: 'Application / In Review',
    desc: 'Lease or purchase documentation under final review.',
  },
  CONVERTED: {
    label: 'Deal Closed & Won',
    desc: 'Congratulations! Deal successfully finalized and secured.',
  },
  LOST: {
    label: 'Closed / Archived',
    desc: 'Deal closed or archived.',
  },
};

@Injectable()
export class GetUserAllianceJourneysUseCase {
  private readonly logger = new Logger(GetUserAllianceJourneysUseCase.name);

  constructor(
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userUuidOrId: string | number): Promise<UserAllianceJourneyDto[]> {
    let user: any = null;
    let userId = 0;

    if (typeof userUuidOrId === 'number' && !isNaN(userUuidOrId)) {
      userId = userUuidOrId;
      user = await this.userRepo.findById(userId);
    } else if (typeof userUuidOrId === 'string' && userUuidOrId.trim().length > 0) {
      if (/^\d+$/.test(userUuidOrId)) {
        userId = Number(userUuidOrId);
        user = await this.userRepo.findById(userId);
      } else {
        user = await this.userRepo.findByUuid(userUuidOrId);
        userId = user?.id || 0;
      }
    }

    if (!user && !userId) {
      return [];
    }

    const { items } = await this.referralRepo.findUserReferrals(userId, {
      email: user?.email || undefined,
      phone: user?.phone || undefined,
      take: 50,
    });

    // Automatically link matchedUserId if it was null
    for (const item of items) {
      if (!item.matchedUserId && userId) {
        this.referralRepo.update(item.id, { matchedUserId: userId }).catch(() => null);
      }
    }

    const results: UserAllianceJourneyDto[] = [];

    for (const item of items) {
      if (!item.listing) continue;

      const currentStage = item.stage;
      const stageIdx = STAGE_ORDER.indexOf(currentStage);

      // Construct stages stepper
      const stages: UserAllianceJourneyStageItem[] = [
        {
          key: 'INQUIRY',
          label: 'Inquiry / Referral',
          description: 'Inquiry submitted or recommendation received',
          isCompleted: stageIdx >= 0,
          isCurrent: currentStage === 'NEW' || currentStage === 'CONTACTED',
        },
        {
          key: 'INTERESTED',
          label: 'Interest Confirmed',
          description: 'Property manager confirmed requirement fit',
          isCompleted: stageIdx >= 2,
          isCurrent: currentStage === 'INTERESTED',
        },
        {
          key: 'VIEWING',
          label: 'Inspection Scheduled',
          description: 'Property viewing and inspection arranged',
          isCompleted: stageIdx >= 3,
          isCurrent: currentStage === 'VIEWING',
        },
        {
          key: 'APPLICATION',
          label: 'Application & Offer',
          description: 'Offer submitted and lease papers in review',
          isCompleted: stageIdx >= 4,
          isCurrent: currentStage === 'APPLICATION',
        },
        {
          key: 'CONVERTED',
          label: 'Deal Secured',
          description: 'Payment completed & keys handed over',
          isCompleted: currentStage === 'CONVERTED',
          isCurrent: currentStage === 'CONVERTED',
        },
      ];

      // Check if user already rated
      let hasRated = false;
      try {
        const rating = await this.ratingRepo.findByReferralAndAuthor(
          item.id,
          'CLIENT',
          userId,
        );
        hasRated = !!rating;
      } catch {
        hasRated = false;
      }

      const meta = STAGE_META[currentStage] || {
        label: currentStage,
        desc: 'Stage update in progress',
      };

      results.push({
        referralUuid: item.uuid,
        shareToken: item.shareToken,
        status: item.status,
        stage: currentStage,
        stageIndex: Math.max(0, stageIdx),
        stageLabel: meta.label,
        stageDescription: meta.desc,
        stages,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        convertedAt: item.convertedAt,
        listing: {
          uuid: item.listing.uuid,
          title: item.listing.title,
          description: item.listing.description,
          price: item.listing.price,
          currency: item.listing.currency || 'NGN',
          intent: item.listing.intent || 'RENT',
          address: item.listing.address,
          city: item.listing.city,
          state: item.listing.state,
          propertyType: item.listing.propertyType,
          bedrooms: item.listing.bedrooms,
          bathrooms: item.listing.bathrooms,
          media: (item.listing.media || []).map((m: any) => ({
            uuid: m.uuid,
            publicUrl: m.publicUrl,
            sortOrder: m.sortOrder || 0,
          })),
        },
        referringPm: {
          uuid: item.referringPm?.uuid,
          displayName: item.referringPm?.name || 'Upward Partner Agent',
          companyName: item.referringPm?.companyName,
        },
        listingPm: item.listing.pm
          ? {
              uuid: item.listing.pm.uuid,
              displayName: item.listing.pm.name,
              companyName: item.listing.pm.companyName,
            }
          : undefined,
        hasRated,
      });
    }

    return results;
  }
}
