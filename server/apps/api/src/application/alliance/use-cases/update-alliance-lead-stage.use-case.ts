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
  IAllianceProfileRepository,
  IAllianceReferralRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { UpdateAllianceLeadStageDto } from '../dtos/alliance-referral.dto';
import {
  AllianceLeadStage,
  AllianceReferralStatus,
} from '../../../domains/alliance/alliance.entity';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { NotificationService } from '../../../shared/infrastructure/common/notification.service';

@Injectable()
export class UpdateAllianceLeadStageUseCase {
  private readonly logger = new Logger(UpdateAllianceLeadStageUseCase.name);

  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Optional()
    private readonly activityLogService?: ActivityLogService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

  async execute(uuid: string, dto: UpdateAllianceLeadStageDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify requesting PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    // 2. Fetch referral
    const referral = await this.referralRepo.findByUuid(uuid);
    if (!referral) {
      throw new NotFoundException('Alliance referral not found');
    }

    // 3. Verify ownership: Only the referring PM can update lead stage
    if (referral.referringPmId !== pmId) {
      throw new ForbiddenException('You do not have permission to update this referral');
    }

    if (referral.status === 'CLOSED') {
      throw new BadRequestException('Cannot update stage of a closed referral');
    }

    // 4. Idempotency Check: If stage and notes are unchanged, return without creating duplicate logs
    if (referral.stage === dto.stage && (dto.notes === undefined || referral.notes === dto.notes)) {
      return referral;
    }

    const previousStage = referral.stage;
    const newStage: AllianceLeadStage = dto.stage;

    // Determine status update
    let newStatus: AllianceReferralStatus = referral.status;
    let convertedAt = referral.convertedAt;
    let closedAt = referral.closedAt;

    if (newStage === 'CONVERTED') {
      newStatus = 'CONVERTED';
      convertedAt = new Date();
    } else if (newStage === 'LOST') {
      newStatus = 'LOST';
      closedAt = new Date();
    } else if (referral.status === 'CONVERTED' || referral.status === 'LOST') {
      // Transitioning back to active in-progress stage
      newStatus = 'ACTIVE';
    }

    // 5. Update referral in database
    const updatedReferral = await this.referralRepo.update(referral.id, {
      stage: newStage,
      status: newStatus,
      notes: dto.notes !== undefined ? dto.notes?.trim() ?? null : referral.notes,
      convertedAt,
      closedAt,
    });

    // 6. Log activity
    if (this.activityLogService) {
      try {
        await this.activityLogService.log({
          pmId,
          ownerPmId: pmId,
          employeeId: actor.isEmployee ? actor.employeeId : undefined,
          action: 'UPDATE_ALLIANCE_LEAD_STAGE',
          entityType: 'ALLIANCE_REFERRAL',
          entityId: referral.uuid,
          description: `Updated lead stage for client ${referral.clientName} from ${previousStage} to ${newStage}`,
          metadata: {
            previousStage,
            newStage,
            status: newStatus,
          },
        });
      } catch (err) {
        this.logger.error('Failed to log lead stage update activity', err);
      }
    }

    // 7. Notify client if matched Upward user on material advancement
    if (
      referral.matchedUserId &&
      this.notificationService &&
      (newStage === 'VIEWING' || newStage === 'APPLICATION' || newStage === 'CONVERTED')
    ) {
      try {
        await this.notificationService.notifyUser(referral.matchedUserId, {
          title: 'Referral Status Updated',
          message: `Your property inquiry for "${referral.listing?.title || 'Alliance Listing'}" is now at stage: ${newStage}`,
          type: 'SYSTEM',
          url: `/shared/listings/${referral.shareToken}`,
          data: {
            referralUuid: referral.uuid,
            stage: newStage,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to send stage update notification to user ${referral.matchedUserId}`, err);
      }
    }

    return updatedReferral;
  }
}
