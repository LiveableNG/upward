import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { CreateAllianceReferralDto } from '../dtos/alliance-referral.dto';
import { NotificationService } from '../../../shared/infrastructure/common/notification.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class CreateAllianceReferralUseCase {
  private readonly logger = new Logger(CreateAllianceReferralUseCase.name);

  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    private readonly activityLogService?: ActivityLogService,
  ) {}

  private normalizeEmail(email?: string): string | null {
    if (!email) return null;
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    let cleaned = phone.trim().replace(/\s+/g, '');
    if (!cleaned) return null;

    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.substring(1);
      } else if (cleaned.length === 10) {
        cleaned = '+234' + cleaned;
      }
    }
    return cleaned;
  }

  async execute(listingUuid: string, dto: CreateAllianceReferralDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify requesting PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    // 2. Validate client contact information
    const normalizedEmail = this.normalizeEmail(dto.clientEmail);
    const normalizedPhone = this.normalizePhone(dto.clientPhone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException('Please provide a valid client email or phone number');
    }

    // 3. Fetch listing and verify eligibility
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found');
    }

    if (listing.pmId === pmId) {
      throw new BadRequestException('You cannot create an Alliance referral for your own listing');
    }

    if (
      listing.status !== 'PUBLISHED' ||
      listing.visibility !== 'ALLIANCE' ||
      listing.isSourceDeleted
    ) {
      throw new BadRequestException('Listing is not eligible for referrals');
    }

    const ownerProfile = await this.profileRepo.findByPmId(listing.pmId);
    if (!ownerProfile || !ownerProfile.isEnabled) {
      throw new BadRequestException('Listing owner is no longer enabled for Upward Alliance');
    }

    // 4. Server-side User Matching (Match existing Upward user by email or phone)
    let matchedUser = null;
    if (normalizedEmail) {
      matchedUser = await this.userRepo.findByEmail(normalizedEmail);
    }
    if (!matchedUser && normalizedPhone) {
      matchedUser = await this.userRepo.findByPhone(normalizedPhone);
    }

    // Ignore placeholder internal dummy accounts
    if (matchedUser && matchedUser.email?.endsWith('@upward.com')) {
      matchedUser = null;
    }

    // 5. Determine unique client identity key for exclusivity
    let clientIdentityKey: string;
    if (matchedUser) {
      clientIdentityKey = `usr:${matchedUser.id}`;
    } else if (normalizedEmail) {
      clientIdentityKey = `email:${normalizedEmail}`;
    } else {
      clientIdentityKey = `phone:${normalizedPhone}`;
    }

    // 6. Enforce Referral Exclusivity (Prevent race conditions or competing active claims)
    const existingActive = await this.referralRepo.findActiveReferral(listing.id, clientIdentityKey);
    if (existingActive) {
      throw new BadRequestException(
        'An active referral relationship already exists for this client on this listing',
      );
    }

    // 7. Create referral record
    const shareToken = randomUUID();
    const createdReferral = await this.referralRepo.create({
      listingId: listing.id,
      referringPmId: pmId,
      matchedUserId: matchedUser?.id ?? null,
      clientIdentityKey,
      clientName: dto.clientName.trim(),
      clientEmail: dto.clientEmail?.trim() ?? null,
      clientPhone: dto.clientPhone?.trim() ?? null,
      clientNormalizedEmail: normalizedEmail,
      clientNormalizedPhone: normalizedPhone,
      shareToken,
      status: 'ACTIVE',
      stage: 'NEW',
      notes: dto.notes?.trim() ?? null,
    });

    // 8. Log activity
    if (this.activityLogService) {
      try {
        await this.activityLogService.log({
          pmId,
          ownerPmId: pmId,
          employeeId: actor.isEmployee ? actor.employeeId : undefined,
          action: 'CREATE_ALLIANCE_REFERRAL',
          entityType: 'ALLIANCE_REFERRAL',
          entityId: createdReferral.uuid,
          description: `Referred client ${dto.clientName.trim()} to Alliance listing: ${listing.title}`,
          metadata: {
            listingUuid: listing.uuid,
            shareToken,
            matchedUserId: matchedUser?.id ?? null,
          },
        });
      } catch (err) {
        this.logger.error('Failed to log alliance referral activity', err);
      }
    }

    // 9. Dispatch notifications
    if (typeof matchedUser?.id === 'number' && this.notificationService) {
      const targetUserId = matchedUser.id;
      try {
        await this.notificationService.notifyUser(targetUserId, {
          title: 'New Property Shared With You',
          message: `A property manager shared an Alliance opportunity with you: "${listing.title}"`,
          type: 'SYSTEM',
          url: `/shared/listings/${shareToken}`,
          data: {
            referralUuid: createdReferral.uuid,
            listingUuid: listing.uuid,
            shareToken,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to dispatch in-app notification to user ${targetUserId}`, err);
      }
    }

    if (normalizedEmail && this.emailService) {
      try {
        await this.emailService.sendEmailWithRetry({
          email: normalizedEmail,
          subject: `Opportunity Shared: ${listing.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px; max-width: 600px;">
              <h2 style="color: #1e3a8a;">Hello ${dto.clientName.trim()},</h2>
              <p>A property manager has shared an Alliance property listing with you:</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #0f172a;">${listing.title}</h3>
                <p style="font-size: 18px; font-weight: bold; color: #15803d; margin: 8px 0;">
                  ${listing.currency} ${listing.price.toLocaleString()}
                </p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0;">
                  ${[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
                </p>
              </div>
              <p>You can view the full details using your secure referral link below:</p>
              <p style="margin: 20px 0;">
                <a href="https://app.upward.ng/shared/listings/${shareToken}" style="background: #15803d; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  View Property Details
                </a>
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
                This invitation was sent directly by an authorized property manager on the Upward Alliance Network.
              </p>
            </div>
          `,
          text: `Hello ${dto.clientName.trim()},\n\nA property manager has shared an Alliance listing with you: "${listing.title}".\n\nView details: https://app.upward.ng/shared/listings/${shareToken}`,
          type: 'SYSTEM_ALERT',
        });
      } catch (err) {
        this.logger.error(`Failed to send referral email to ${normalizedEmail}`, err);
      }
    }

    return createdReferral;
  }
}
