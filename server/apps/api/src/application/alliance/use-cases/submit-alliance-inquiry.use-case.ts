import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_REFERRAL_REPOSITORY,
  IAllianceListingRepository,
  IAllianceReferralRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { SubmitAllianceInquiryDto } from '../dtos/alliance-public-marketplace.dto';
import { NotificationService } from '../../../shared/infrastructure/common/notification.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class SubmitAllianceInquiryUseCase {
  private readonly logger = new Logger(SubmitAllianceInquiryUseCase.name);

  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Optional()
    private readonly notificationService?: NotificationService,
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

  async execute(
    listingUuid: string,
    dto: SubmitAllianceInquiryDto,
    userId?: number,
  ): Promise<{ success: boolean; message: string; referralUuid?: string }> {
    const listing = await this.listingRepo.findPublicByUuid(listingUuid);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found or is no longer available');
    }

    if (!dto.clientName || dto.clientName.trim().length === 0) {
      throw new BadRequestException('Client name is required');
    }

    if (!dto.clientEmail && !dto.clientPhone) {
      throw new BadRequestException('Please provide a contact email or phone number');
    }

    const normalizedEmail = this.normalizeEmail(dto.clientEmail);
    const normalizedPhone = this.normalizePhone(dto.clientPhone);

    let clientIdentityKey: string;
    if (userId) {
      clientIdentityKey = `usr:${userId}`;
    } else if (normalizedEmail) {
      clientIdentityKey = `email:${normalizedEmail}`;
    } else {
      clientIdentityKey = `phone:${normalizedPhone}`;
    }

    let referralUuid: string | undefined;

    // Handle referral context if token is provided
    if (dto.referralToken && dto.referralToken.trim().length > 0) {
      const referral = await this.referralRepo.findByShareToken(dto.referralToken.trim());
      if (referral && referral.listingId === listing.id && referral.status === 'ACTIVE') {
        referralUuid = referral.uuid;

        // Progress stage to CONTACTED if currently NEW
        const updateData: any = {};
        if (referral.stage === 'NEW') {
          updateData.stage = 'CONTACTED';
        }
        if (userId && !referral.matchedUserId) {
          updateData.matchedUserId = userId;
        }
        if (dto.message && dto.message.trim().length > 0) {
          const prevNotes = referral.notes ? `${referral.notes}\n\n` : '';
          updateData.notes = `${prevNotes}[Client Inquiry]: ${dto.message.trim()}`;
        }
        if (Object.keys(updateData).length > 0) {
          await this.referralRepo.update(referral.id, updateData);
        }

        // Audit log
        if (this.activityLogService && referral.referringPmId) {
          await this.activityLogService.log({
            pmId: referral.referringPmId,
            ownerPmId: referral.referringPmId,
            action: 'ALLIANCE_REFERRAL_INQUIRY_RECEIVED',
            entityType: 'ALLIANCE_REFERRAL',
            entityId: String(referral.id),
            description: `Client ${dto.clientName} sent an inquiry for listing "${listing.title}"`,
            metadata: {
              listingUuid: listing.uuid,
              clientName: dto.clientName,
              clientEmail: dto.clientEmail,
              message: dto.message,
            },
          }).catch((err: any) => this.logger.warn('Failed to log referral inquiry activity', err));
        }

        // Notify referring PM
        if (this.notificationService && referral.referringPmId) {
          this.logger.log(`Notified referring PM ${referral.referringPmId} of inquiry on referral ${referral.uuid}`);
        }
      }
    }

    // Direct Marketplace Inquiry (no referral token) -> Create/Update direct lead for listing owner PM
    if (!referralUuid && listing.pmId) {
      const existingReferral = await this.referralRepo.findActiveReferral(listing.id, clientIdentityKey);
      if (existingReferral) {
        referralUuid = existingReferral.uuid;
        const updateData: any = {};
        if (existingReferral.stage === 'NEW') {
          updateData.stage = 'CONTACTED';
        }
        if (userId && !existingReferral.matchedUserId) {
          updateData.matchedUserId = userId;
        }
        if (dto.message && dto.message.trim().length > 0) {
          const prevNotes = existingReferral.notes ? `${existingReferral.notes}\n\n` : '';
          updateData.notes = `${prevNotes}[Marketplace Inquiry]: ${dto.message.trim()}`;
        }
        if (Object.keys(updateData).length > 0) {
          await this.referralRepo.update(existingReferral.id, updateData);
        }
      } else {
        const shareToken = randomUUID();
        const created = await this.referralRepo.create({
          listingId: listing.id,
          referringPmId: listing.pmId,
          matchedUserId: userId ?? null,
          clientIdentityKey,
          clientName: dto.clientName.trim(),
          clientEmail: dto.clientEmail?.trim() ?? null,
          clientPhone: dto.clientPhone?.trim() ?? null,
          clientNormalizedEmail: normalizedEmail,
          clientNormalizedPhone: normalizedPhone,
          shareToken,
          status: 'ACTIVE',
          stage: 'CONTACTED',
          notes: dto.message?.trim() ? `[Direct Inquiry]: ${dto.message.trim()}` : 'Direct Marketplace Inquiry',
        });
        referralUuid = created.uuid;
      }
    }

    // Notify listing owner PM
    if (listing.pmId) {
      this.logger.log(`Inquiry received for listing ${listing.uuid} owned by PM ${listing.pmId}`);
      if (this.activityLogService) {
        await this.activityLogService.log({
          pmId: listing.pmId,
          ownerPmId: listing.pmId,
          action: 'ALLIANCE_LISTING_INQUIRY_RECEIVED',
          entityType: 'ALLIANCE_LISTING',
          entityId: String(listing.id),
          description: `Received client inquiry for listing "${listing.title}" from ${dto.clientName}`,
          metadata: {
            clientName: dto.clientName,
            clientEmail: dto.clientEmail,
            clientPhone: dto.clientPhone,
            message: dto.message,
            referralUuid,
          },
        }).catch((err: any) => this.logger.warn('Failed to log listing inquiry activity', err));
      }
    }

    return {
      success: true,
      message: 'Your inquiry has been successfully sent to the property manager.',
      referralUuid,
    };
  }
}
