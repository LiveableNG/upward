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
import {
  ConfirmMediaUploadDto,
  ALLOWED_ALLIANCE_MEDIA_MIME_TYPES,
  MAX_ALLIANCE_MEDIA_SIZE_BYTES,
  MAX_ALLIANCE_MEDIA_PER_LISTING,
} from '../dtos/alliance-listing-media.dto';

@Injectable()
export class ConfirmAllianceMediaUploadUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: IAllianceListingMediaRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(listingUuid: string, dto: ConfirmMediaUploadDto, actor: PmActorContext) {
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
      throw new BadRequestException('Cannot add media to an archived listing');
    }

    // Verify storageKey format matches listing namespace
    const expectedPrefix = `alliance/listings/${listing.uuid}/`;
    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid storage key for this listing');
    }

    if (!ALLOWED_ALLIANCE_MEDIA_MIME_TYPES.includes(dto.mimeType as any)) {
      throw new BadRequestException(
        `Invalid MIME type. Allowed types: ${ALLOWED_ALLIANCE_MEDIA_MIME_TYPES.join(', ')}`,
      );
    }

    if (dto.fileSize > MAX_ALLIANCE_MEDIA_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds allowed limit');
    }

    const currentMediaCount = await this.mediaRepo.countByListingId(listing.id);
    if (currentMediaCount >= MAX_ALLIANCE_MEDIA_PER_LISTING) {
      throw new BadRequestException(
        `Listing already has maximum allowed images (${MAX_ALLIANCE_MEDIA_PER_LISTING})`,
      );
    }

    const createdMedia = await this.mediaRepo.create({
      listingId: listing.id,
      storageKey: dto.storageKey,
      publicUrl: dto.publicUrl,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      sortOrder: currentMediaCount,
    });

    await this.activityLog.log({
      pmId: actor.ownerPmId,
      ownerPmId: pmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      action: 'ALLIANCE_LISTING_MEDIA_UPLOADED',
      entityType: 'ALLIANCE_LISTING_MEDIA',
      entityId: createdMedia.uuid,
      description: `Uploaded media image for Alliance listing "${listing.title}"`,
      metadata: {
        listingId: listing.id,
        listingUuid: listing.uuid,
        mediaId: createdMedia.id,
        mediaUuid: createdMedia.uuid,
        storageKey: createdMedia.storageKey,
        sortOrder: createdMedia.sortOrder,
      },
    });

    return createdMedia;
  }
}
