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
export class ArchiveAllianceListingUseCase {
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

    if (listing.status === 'ARCHIVED') {
      return listing; // Idempotent
    }

    const updated = await this.listingRepo.update(listing.id, {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });

    await this.activityLog.log({
      pmId: actor.ownerPmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      ownerPmId: actor.ownerPmId,
      action: 'ARCHIVE_ALLIANCE_LISTING',
      entityType: 'ALLIANCE_LISTING',
      entityId: listing.uuid,
      description: `Archived Alliance listing "${updated.title}"`,
      metadata: { previousStatus: listing.status },
    });

    return updated;
  }
}
