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
import { UpdateAllianceListingDto } from '../dtos/alliance-listing.dto';

@Injectable()
export class UpdateAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(listingUuid: string, dto: UpdateAllianceListingDto, actor: PmActorContext) {
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing || listing.pmId !== actor.ownerPmId) {
      throw new NotFoundException('Alliance listing not found');
    }

    if (listing.status === 'ARCHIVED') {
      throw new BadRequestException('Archived listings cannot be updated');
    }

    const updatePayload: any = {};
    if (dto.title !== undefined) updatePayload.title = dto.title.trim();
    if (dto.description !== undefined) updatePayload.description = dto.description?.trim() || null;
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.price !== undefined) updatePayload.price = dto.price;
    if (dto.intent !== undefined) updatePayload.intent = dto.intent;
    if (dto.address !== undefined) updatePayload.address = dto.address?.trim() || null;
    if (dto.city !== undefined) updatePayload.city = dto.city?.trim() || null;
    if (dto.state !== undefined) updatePayload.state = dto.state?.trim() || null;
    if (dto.country !== undefined) updatePayload.country = dto.country?.trim() || 'Nigeria';
    if (dto.propertyType !== undefined) updatePayload.propertyType = dto.propertyType?.trim() || null;
    if (dto.bedrooms !== undefined) updatePayload.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) updatePayload.bathrooms = dto.bathrooms;

    const updated = await this.listingRepo.update(listing.id, updatePayload);

    await this.activityLog.log({
      pmId: actor.ownerPmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      ownerPmId: actor.ownerPmId,
      action: 'UPDATE_ALLIANCE_LISTING',
      entityType: 'ALLIANCE_LISTING',
      entityId: listing.uuid,
      description: `Updated Alliance listing presentation details for "${updated.title}"`,
      metadata: { updatePayload },
    });

    return updated;
  }
}
