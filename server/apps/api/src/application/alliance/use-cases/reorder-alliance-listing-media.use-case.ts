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
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { ReorderMediaDto } from '../dtos/alliance-listing-media.dto';

@Injectable()
export class ReorderAllianceListingMediaUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: IAllianceListingMediaRepository,
    private readonly activityLog: ActivityLogService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(listingUuid: string, dto: ReorderMediaDto, actor: PmActorContext) {
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
      throw new BadRequestException('Cannot reorder media on an archived listing');
    }

    const existingMedia = await this.mediaRepo.findByListingId(listing.id);
    if (existingMedia.length === 0) {
      return [];
    }

    // Check for duplicates
    const uniqueUuids = new Set(dto.mediaUuids);
    if (uniqueUuids.size !== dto.mediaUuids.length) {
      throw new BadRequestException('Duplicate media IDs provided in reorder list');
    }

    // Verify all media IDs belong to this listing
    if (dto.mediaUuids.length !== existingMedia.length) {
      throw new BadRequestException(
        `Reorder list must contain all ${existingMedia.length} media items for this listing`,
      );
    }

    const mediaMap = new Map(existingMedia.map((m) => [m.uuid, m]));
    const orderedIds: number[] = [];

    for (const uuid of dto.mediaUuids) {
      const mediaItem = mediaMap.get(uuid);
      if (!mediaItem) {
        throw new BadRequestException(`Media item with ID ${uuid} does not belong to this listing`);
      }
      orderedIds.push(mediaItem.id);
    }

    const updatedMedia = await this.mediaRepo.reorder(listing.id, orderedIds);

    await this.activityLog.log({
      pmId: actor.ownerPmId,
      ownerPmId: pmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      action: 'ALLIANCE_LISTING_MEDIA_REORDERED',
      entityType: 'ALLIANCE_LISTING',
      entityId: listing.uuid,
      description: `Reordered media images for Alliance listing "${listing.title}"`,
      metadata: {
        listingId: listing.id,
        listingUuid: listing.uuid,
        orderedIds,
      },
    });

    return Promise.all(
      updatedMedia.map(async (m) => ({
        ...m,
        publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
      })),
    );
  }
}
