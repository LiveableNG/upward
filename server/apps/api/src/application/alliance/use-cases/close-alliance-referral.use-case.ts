import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
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
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class CloseAllianceReferralUseCase {
  private readonly logger = new Logger(CloseAllianceReferralUseCase.name);

  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_REFERRAL_REPOSITORY)
    private readonly referralRepo: IAllianceReferralRepository,
    @Optional()
    private readonly activityLogService?: ActivityLogService,
  ) {}

  async execute(uuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // Verify requesting PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const referral = await this.referralRepo.findByUuid(uuid);
    if (!referral) {
      throw new NotFoundException('Alliance referral not found');
    }

    // Ownership check: Only referring PM can close referral
    if (referral.referringPmId !== pmId) {
      throw new ForbiddenException('You do not have permission to close this referral');
    }

    // Idempotent: If already closed, return
    if (referral.status === 'CLOSED') {
      return referral;
    }

    const updatedReferral = await this.referralRepo.update(referral.id, {
      status: 'CLOSED',
      closedAt: new Date(),
    });

    if (this.activityLogService) {
      try {
        await this.activityLogService.log({
          pmId,
          ownerPmId: pmId,
          employeeId: actor.isEmployee ? actor.employeeId : undefined,
          action: 'CLOSE_ALLIANCE_REFERRAL',
          entityType: 'ALLIANCE_REFERRAL',
          entityId: referral.uuid,
          description: `Closed Alliance referral for client ${referral.clientName}`,
        });
      } catch (err) {
        this.logger.error('Failed to log close alliance referral activity', err);
      }
    }

    return updatedReferral;
  }
}
