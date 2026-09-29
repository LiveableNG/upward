import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_LISTING_TRACKER_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
  IAllianceListingTrackerRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

@Injectable()
export class TrackAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_LISTING_TRACKER_REPOSITORY)
    private readonly trackerRepo: IAllianceListingTrackerRepository,
  ) {}

  async execute(listingUuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify requesting actor's PM has Alliance access enabled
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    // 2. Fetch the listing
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing) {
      throw new NotFoundException('Alliance listing not found');
    }

    // 3. Prevent self-tracking
    if (listing.pmId === pmId) {
      throw new BadRequestException('You cannot track your own listing');
    }

    // 4. Verify listing is eligible (PUBLISHED, ALLIANCE visibility, not source deleted, owner PM enabled)
    if (
      listing.status !== 'PUBLISHED' ||
      listing.visibility !== 'ALLIANCE' ||
      listing.isSourceDeleted
    ) {
      throw new BadRequestException('Listing is not eligible for tracking');
    }

    const ownerProfile = await this.profileRepo.findByPmId(listing.pmId);
    if (!ownerProfile || !ownerProfile.isEnabled) {
      throw new BadRequestException('Listing owner is no longer enabled for Upward Alliance');
    }

    // 5. Create or ensure tracker record (idempotent)
    await this.trackerRepo.track(listing.id, pmId);

    return {
      success: true,
      isTracked: true,
    };
  }
}
