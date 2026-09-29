import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  IAllianceListingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

@Injectable()
export class UnpublishAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(listingUuid: string, actor: PmActorContext) {
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing || listing.pmId !== actor.ownerPmId) {
      throw new NotFoundException('Alliance listing not found');
    }

    if (listing.status === 'UNPUBLISHED') {
      return listing; // Idempotent
    }

    if (listing.status !== 'PUBLISHED') {
      throw new BadRequestException(`Cannot unpublish a listing with status "${listing.status}"`);
    }

    const updated = await this.listingRepo.update(listing.id, {
      status: 'UNPUBLISHED',
      unpublishedAt: new Date(),
    });

    await this.activityLog.log({
      pmId: actor.ownerPmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      ownerPmId: actor.ownerPmId,
      action: 'UNPUBLISH_ALLIANCE_LISTING',
      entityType: 'ALLIANCE_LISTING',
      entityId: listing.uuid,
      description: `Unpublished Alliance listing "${updated.title}"`,
      metadata: { previousStatus: listing.status },
    });

    return updated;
  }
}
