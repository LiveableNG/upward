import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import {
  UploadAllianceListingMediaDto,
  MAX_ALLIANCE_MEDIA_SIZE_BYTES,
  MAX_ALLIANCE_MEDIA_PER_LISTING,
} from '../dtos/alliance-listing-media.dto';

@Injectable()
export class UploadAllianceListingMediaUseCase {
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

  async execute(listingUuid: string, dto: UploadAllianceListingMediaDto, actor: PmActorContext) {
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

    const contentType = dto.contentType || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for alliance listings');
    }

    // Clean base64 if it has data URL prefix
    const rawData = dto.base64Data || '';
    const base64Clean = rawData.includes(',') ? rawData.split(',')[1] || '' : rawData;
    const buffer = Buffer.from(base64Clean, 'base64');

    if (buffer.length > MAX_ALLIANCE_MEDIA_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_ALLIANCE_MEDIA_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }

    const currentMediaCount = await this.mediaRepo.countByListingId(listing.id);
    if (currentMediaCount >= MAX_ALLIANCE_MEDIA_PER_LISTING) {
      throw new BadRequestException(
        `Listing already has maximum allowed images (${MAX_ALLIANCE_MEDIA_PER_LISTING})`,
      );
    }

    const extParts = dto.filename?.split('.') || [];
    const ext = (extParts.length > 1 ? extParts.pop()?.toLowerCase() : contentType.split('/')[1] || 'jpg') || 'jpg';
    const mediaUuid = randomUUID();
    const storageKey = `alliance/listings/${listing.uuid}/${mediaUuid}.${ext}`;

    const publicUrl = await this.s3Service.uploadBuffer(buffer, storageKey, contentType);

    const createdMedia = await this.mediaRepo.create({
      listingId: listing.id,
      storageKey,
      publicUrl,
      mimeType: contentType,
      fileSize: buffer.length,
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
      },
    });

    const signedUrl = await this.s3Service.getDownloadUrl(storageKey || publicUrl);

    return {
      ...createdMedia,
      publicUrl: signedUrl,
    };
  }
}
