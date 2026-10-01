import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceListingRepository,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

@Injectable()
export class PublishAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(listingUuid: string, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify PM Alliance enablement
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    // 2. Find listing
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing || listing.pmId !== pmId) {
      throw new NotFoundException('Alliance listing not found');
    }

    // 3. Lifecycle validation
    if (listing.status === 'PUBLISHED') {
      return listing; // Idempotent
    }
    if (listing.status === 'ARCHIVED') {
      throw new BadRequestException('Archived listings cannot be published');
    }
    if (listing.status !== 'DRAFT' && listing.status !== 'UNPUBLISHED') {
      throw new BadRequestException(`Cannot publish listing with status "${listing.status}"`);
    }

    // 4. Validate presentation readiness
    if (!listing.title || listing.title.trim().length === 0) {
      throw new BadRequestException('Listing title is required before publishing');
    }

    // 5. Validate linked canonical targets and check for conflicts
    if (listing.sourceType === 'LINKED_INVENTORY') {
      if (listing.isSourceDeleted) {
        throw new BadRequestException('Cannot publish a listing whose canonical inventory source has been deleted');
      }

      if (listing.targetType === 'PROPERTY') {
        if (!listing.targetPropertyId) {
          throw new BadRequestException('Linked property listing is missing target property');
        }

        const canonicalProperty = await this.prisma.upward_pm_property.findUnique({
          where: { id: listing.targetPropertyId },
          select: { id: true, pmId: true },
        });
        if (!canonicalProperty || canonicalProperty.pmId !== pmId) {
          throw new NotFoundException('Canonical property no longer exists in your inventory');
        }

        // Check if another published listing exists for this property
        const conflicting = await this.listingRepo.findPublishedByTargetProperty(listing.targetPropertyId);
        if (conflicting && conflicting.id !== listing.id) {
          throw new ConflictException('Another published listing already exists for this canonical property');
        }
      } else if (listing.targetType === 'UNIT') {
        if (!listing.targetUnitId) {
          throw new BadRequestException('Linked unit listing is missing target unit');
        }

        const canonicalUnit = await this.prisma.upward_pm_unit.findUnique({
          where: { id: listing.targetUnitId },
          select: { id: true, property: { select: { pmId: true } } },
        });
        if (!canonicalUnit || canonicalUnit.property.pmId !== pmId) {
          throw new NotFoundException('Canonical unit no longer exists in your inventory');
        }

        // Check if another published listing exists for this unit
        const conflicting = await this.listingRepo.findPublishedByTargetUnit(listing.targetUnitId);
        if (conflicting && conflicting.id !== listing.id) {
          throw new ConflictException('Another published listing already exists for this canonical unit');
        }
      }
    }

    // 6. Transition to PUBLISHED
    try {
      const updated = await this.listingRepo.update(listing.id, {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        unpublishedAt: null,
      });

      await this.activityLog.log({
        pmId: actor.ownerPmId,
        employeeId: actor.isEmployee ? actor.employeeId : undefined,
        ownerPmId: pmId,
        action: 'PUBLISH_ALLIANCE_LISTING',
        entityType: 'ALLIANCE_LISTING',
        entityId: listing.uuid,
        description: `Published Alliance listing "${updated.title}"`,
        metadata: {
          targetType: updated.targetType,
          sourceType: updated.sourceType,
          price: updated.price,
        },
      });

      return updated;
    } catch (err: any) {
      // Catch PostgreSQL partial unique index violation (code 23505) in case of concurrent requests
      if (err.code === 'P2002' || err.message?.includes('targetPropertyId_published_idx') || err.message?.includes('targetUnitId_published_idx')) {
        throw new ConflictException('Another published listing already exists for this target');
      }
      throw err;
    }
  }
}
