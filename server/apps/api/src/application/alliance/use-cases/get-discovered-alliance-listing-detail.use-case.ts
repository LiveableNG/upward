import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetDiscoveredAllianceListingDetailUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(listingUuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // Verify requesting actor's PM has Alliance access enabled
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const listing = await this.listingRepo.findDiscoverableByUuid(listingUuid, pmId);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found or is no longer discoverable');
    }

    if (listing.media && listing.media.length > 0) {
      listing.media = await Promise.all(
        listing.media.map(async (m) => ({
          ...m,
          publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
        })),
      );
    }

    return listing;
  }
}
