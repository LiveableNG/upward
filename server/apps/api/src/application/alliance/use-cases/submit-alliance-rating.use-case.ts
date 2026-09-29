import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  ALLIANCE_RATING_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { SubmitAllianceRatingDto } from '../dtos/alliance-rating.dto';
import {
  AllianceRatingAuthorType,
  AllianceRatingSubjectType,
} from '../../../domains/alliance/alliance.entity';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { NotificationService } from '../../../shared/infrastructure/common/notification.service';

@Injectable()
export class SubmitAllianceRatingUseCase {
  private readonly logger = new Logger(SubmitAllianceRatingUseCase.name);

  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
    @Optional()
    private readonly activityLogService?: ActivityLogService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

  async execute(
    dto: SubmitAllianceRatingDto,
    author: {
      type: AllianceRatingAuthorType;
      pmActor?: PmActorContext;
      userId?: number;
    },
  ) {
    // 1. Validate score
    if (!Number.isInteger(dto.score) || dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('Rating score must be an integer between 1 and 5');
    }

    // 2. Fetch referral
    const referral = await this.referralRepo.findByUuid(dto.referralUuid);
    if (!referral) {
      throw new NotFoundException('Alliance referral not found');
    }

    // 3. Verify qualifying completed relationship: Referral MUST be CONVERTED
    if (referral.status !== 'CONVERTED') {
      throw new BadRequestException('Ratings are only eligible after a qualifying referral relationship has successfully converted');
    }

    let authorPmId: number | null = null;
    let authorUserId: number | null = null;
    let subjectType: AllianceRatingSubjectType = 'CLIENT';
    let subjectPmId: number | null = null;
    let subjectUserId: number | null = null;
    let subjectListingId: number | null = null;

    if (author.type === 'PM') {
      if (!author.pmActor) {
        throw new ForbiddenException('Property manager context required');
      }
      const pmId = author.pmActor.ownerPmId;

      const profile = await this.profileRepo.findByPmId(pmId);
      if (!profile || !profile.isEnabled) {
        throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
      }

      // Verify PM is a legitimate participant in this referral relationship
      const isReferringPm = referral.referringPmId === pmId;
      const isListingOwner = referral.listing?.pmId === pmId;

      if (!isReferringPm && !isListingOwner) {
        throw new ForbiddenException('You were not a participant in this completed transaction');
      }

      authorPmId = pmId;

      if (isReferringPm) {
        // Referring PM rates the listing owner PM or client
        if (referral.matchedUserId) {
          subjectType = 'CLIENT';
          subjectUserId = referral.matchedUserId;
        } else if (referral.listing?.pmId) {
          subjectType = 'PM';
          subjectPmId = referral.listing.pmId;
        } else {
          subjectType = 'LISTING';
          subjectListingId = referral.listingId;
        }
      } else {
        // Listing owner PM rates the referring PM
        subjectType = 'PM';
        subjectPmId = referral.referringPmId;
      }
    } else {
      // Client author
      if (!author.userId) {
        throw new ForbiddenException('User context required');
      }
      if (referral.matchedUserId !== author.userId) {
        throw new ForbiddenException('You were not the referred client in this completed relationship');
      }
      authorUserId = author.userId;
      subjectType = 'PM';
      subjectPmId = referral.referringPmId;
    }

    // Self-rating check
    if (authorPmId && subjectPmId && authorPmId === subjectPmId) {
      throw new BadRequestException('Self-rating is prohibited');
    }
    if (authorUserId && subjectUserId && authorUserId === subjectUserId) {
      throw new BadRequestException('Self-rating is prohibited');
    }

    // 4. Check uniqueness: Exactly one rating per author per completed referral
    const existing = await this.ratingRepo.findByReferralAndAuthor(
      referral.id,
      author.type,
      (author.type === 'PM' ? authorPmId : authorUserId)!,
    );
    if (existing) {
      throw new BadRequestException('You have already submitted a rating for this completed relationship');
    }

    // 5. Create rating
    const rating = await this.ratingRepo.create({
      referralId: referral.id,
      authorType: author.type,
      authorPmId,
      authorUserId,
      subjectType,
      subjectPmId,
      subjectUserId,
      subjectListingId,
      score: dto.score,
      review: dto.review?.trim() ?? null,
    });

    // 6. Log Activity
    if (this.activityLogService && authorPmId) {
      try {
        await this.activityLogService.log({
          pmId: authorPmId,
          ownerPmId: authorPmId,
          employeeId: author.pmActor?.isEmployee ? author.pmActor.employeeId : undefined,
          action: 'ALLIANCE_RATING_SUBMITTED',
          entityType: 'ALLIANCE_RATING',
          entityId: String(rating.id),
          description: `Alliance rating of ${dto.score}/5 submitted`,
          metadata: {
            referralUuid: referral.uuid,
            score: dto.score,
            subjectType,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to log rating activity: ${err.message}`);
      }
    }

    // 7. Notify Subject if matched user
    if (this.notificationService && subjectUserId) {
      try {
        await this.notificationService.notifyUser(subjectUserId, {
          type: 'SYSTEM',
          title: 'New Alliance Review Received',
          message: `You received a ${dto.score}-star rating for your completed property transaction.`,
          data: {
            referral_uuid: referral.uuid,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch rating notification: ${err.message}`);
      }
    }

    return rating;
  }
}
