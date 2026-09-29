import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_LISTING_MEDIA_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceListingRepository,
  IAllianceListingMediaRepository,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class DeleteAllianceListingMediaUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: IAllianceListingMediaRepository,
    private readonly s3Service: S3Service,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(listingUuid: string, mediaUuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Alliance is not enabled for this Property Manager');
    }

    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found');
    }

    if (listing.pmId !== pmId) {
      throw new ForbiddenException('You do not have permission to manage media for this listing');
    }

    if (listing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot delete media from an archived listing');
    }

    const media = await this.mediaRepo.findByUuid(mediaUuid);
    if (!media || media.listingId !== listing.id) {
      throw new NotFoundException('Media item not found for this listing');
    }

    // 1. Delete from database
    await this.mediaRepo.delete(media.id);

    // 2. Re-index remaining media so sortOrder remains contiguous 0, 1, 2, ...
    await this.mediaRepo.reindexSortOrders(listing.id);

    // 3. Delete from S3 storage
    await this.s3Service.deleteObject(media.storageKey);

    // 4. Audit log
    await this.activityLog.log({
      pmId: actor.ownerPmId,
      ownerPmId: pmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      action: 'ALLIANCE_LISTING_MEDIA_DELETED',
      entityType: 'ALLIANCE_LISTING_MEDIA',
      entityId: media.uuid,
      description: `Deleted media image from Alliance listing "${listing.title}"`,
      metadata: {
        listingId: listing.id,
        listingUuid: listing.uuid,
        mediaId: media.id,
        mediaUuid: media.uuid,
        storageKey: media.storageKey,
      },
    });

    return { success: true };
  }
}
