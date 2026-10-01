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
  ALLIANCE_COMMISSION_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceReferralRepository,
  IAllianceCommissionRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { ConvertAllianceReferralDto } from '../dtos/alliance-commission.dto';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { NotificationService } from '../../../shared/infrastructure/common/notification.service';

@Injectable()
export class ConvertAllianceReferralUseCase {
  private readonly logger = new Logger(ConvertAllianceReferralUseCase.name);

  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Inject(ALLIANCE_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IAllianceCommissionRepository,
    @Optional()
    private readonly activityLogService?: ActivityLogService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

  async execute(referralUuid: string, dto: ConvertAllianceReferralDto, actor?: PmActorContext) {
    // 1. Fetch referral
    const referral = await this.referralRepo.findByUuid(referralUuid);
    if (!referral) {
      throw new NotFoundException('Alliance referral not found');
    }

    // 2. Authorization: If actor is provided, verify PM identity and Alliance enablement
    if (actor) {
      const pmId = actor.ownerPmId;
      const profile = await this.profileRepo.findByPmId(pmId);
      if (!profile || !profile.isEnabled) {
        throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
      }

      // Either the referring PM or the listing owner PM can trigger conversion
      if (referral.referringPmId !== pmId && referral.listing?.pmId !== pmId) {
        throw new ForbiddenException('You do not have permission to convert this referral');
      }
    }

    if (referral.status === 'CLOSED' || referral.status === 'LOST') {
      throw new BadRequestException('Cannot convert a closed or lost referral');
    }

    // 3. Idempotency Check:
    // If a commission already exists for this referral + transaction reference, return existing commission
    const txRef = dto.transactionReference || (dto.sourceTransactionId ? `tx_${dto.sourceTransactionId}` : `ref_${referral.uuid}`);
    const existingCommission = await this.commissionRepo.findByReferralAndTxRef(referral.id, txRef);
    if (existingCommission) {
      this.logger.log(`Idempotent conversion hit for referral ${referralUuid} and ref ${txRef}`);
      return {
        referral,
        commission: existingCommission,
        isNew: false,
      };
    }

    // 4. Calculate deterministic commission amount
    const commissionType = dto.commissionType || 'PERCENTAGE';
    const rate = dto.commissionRate ?? 5.0; // Default 5% referral commission
    let commissionAmount = 0;

    if (commissionType === 'PERCENTAGE') {
      commissionAmount = Math.round(dto.sourceAmount * (rate / 100) * 100) / 100;
    } else {
      commissionAmount = rate;
    }

    const now = new Date();

    // 5. Update referral lifecycle to CONVERTED
    const updatedReferral = await this.referralRepo.update(referral.id, {
      status: 'CONVERTED',
      stage: 'CONVERTED',
      convertedAt: now,
    });

    // 6. Create immutable Commission record attributed strictly to the referring PM
    const commission = await this.commissionRepo.create({
      referralId: referral.id,
      referringPmId: referral.referringPmId, // Attribution STRICTLY to referring PM
      listingId: referral.listingId,
      sourceTransactionId: dto.sourceTransactionId ?? null,
      transactionReference: txRef,
      commissionType,
      sourceAmount: dto.sourceAmount,
      commissionRate: rate,
      commissionAmount,
      currency: referral.listing?.currency || 'NGN',
      status: 'EARNED',
      notes: dto.notes?.trim() ?? null,
      earnedAt: now,
    });

    // 7. Log Activity
    if (this.activityLogService) {
      try {
        await this.activityLogService.log({
          pmId: referral.referringPmId,
          ownerPmId: referral.referringPmId,
          employeeId: actor?.isEmployee ? actor.employeeId : undefined,
          action: 'ALLIANCE_REFERRAL_CONVERTED',
          entityType: 'ALLIANCE_COMMISSION',
          entityId: String(commission.id),
          description: `Alliance referral converted for client ${referral.clientName}`,
          metadata: {
            referralUuid: referral.uuid,
            listingId: referral.listingId,
            sourceAmount: dto.sourceAmount,
            commissionAmount,
            rate,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to write activity log: ${err.message}`);
      }
    }

    // 8. Notify Matched User / Client if exists
    if (this.notificationService && referral.matchedUserId) {
      try {
        await this.notificationService.notifyUser(referral.matchedUserId, {
          type: 'SYSTEM',
          title: 'Transaction Confirmed!',
          message: `Your transaction on "${referral.listing?.title || 'Alliance Property'}" has been successfully completed and confirmed.`,
          data: {
            referral_uuid: referral.uuid,
            listing_uuid: referral.listing?.uuid || '',
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch user notification: ${err.message}`);
      }
    }

    return {
      referral: updatedReferral,
      commission,
      isNew: true,
    };
  }
}
