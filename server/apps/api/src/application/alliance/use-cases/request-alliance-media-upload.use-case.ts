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
import {
  RequestMediaUploadDto,
  ALLOWED_ALLIANCE_MEDIA_MIME_TYPES,
  MAX_ALLIANCE_MEDIA_SIZE_BYTES,
  MAX_ALLIANCE_MEDIA_PER_LISTING,
} from '../dtos/alliance-listing-media.dto';

@Injectable()
export class RequestAllianceMediaUploadUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_LISTING_MEDIA_REPOSITORY)
    private readonly mediaRepo: IAllianceListingMediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(listingUuid: string, dto: RequestMediaUploadDto, actor: PmActorContext) {
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

    if (!ALLOWED_ALLIANCE_MEDIA_MIME_TYPES.includes(dto.mimeType as any)) {
      throw new BadRequestException(
        `Invalid MIME type. Allowed types: ${ALLOWED_ALLIANCE_MEDIA_MIME_TYPES.join(', ')}`,
      );
    }

    if (dto.fileSize > MAX_ALLIANCE_MEDIA_SIZE_BYTES) {
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

    // Generate safe file extension
    const extParts = dto.filename.split('.');
    const ext = (extParts.length > 1 ? extParts.pop()?.toLowerCase() : 'jpg') || 'jpg';
    const mediaUuid = randomUUID();
    const storageKey = `alliance/listings/${listing.uuid}/${mediaUuid}.${ext}`;

    const uploadUrl = await this.s3Service.getUploadUrl(storageKey, dto.mimeType);

    const bucket = process.env['AWS_S3_BUCKET'] || 'upward-stories-storage-2025';
    const region = process.env['AWS_REGION'] || 'us-east-1';
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${storageKey}`;

    return {
      storageKey,
      uploadUrl,
      publicUrl,
      mediaUuid,
      maxFileSize: MAX_ALLIANCE_MEDIA_SIZE_BYTES,
    };
  }
}
