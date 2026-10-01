import {
  Inject,
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
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
import { CreateAllianceListingDto } from '../dtos/alliance-listing.dto';

@Injectable()
export class CreateAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(dto: CreateAllianceListingDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify Alliance enablement for the PM
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    let targetPropertyId: number | null = null;
    let targetUnitId: number | null = null;

    // 2. Validate source/target combinations
    if (dto.sourceType === 'LINKED_INVENTORY') {
      if (dto.targetType === 'PROPERTY') {
        if (!dto.targetPropertyUuid) {
          throw new BadRequestException('targetPropertyUuid is required for linked property listings');
        }
        if (dto.targetUnitUuid) {
          throw new BadRequestException('targetUnitUuid must not be provided for property listings');
        }

        const property = await this.prisma.upward_pm_property.findUnique({
          where: { uuid: dto.targetPropertyUuid },
          select: { id: true, pmId: true, name: true, address: true, state: true, country: true },
        });

        if (!property || property.pmId !== pmId) {
          throw new NotFoundException('Canonical property not found in your inventory');
        }

        // Validate employee assignment if custom access
        if (actor.isEmployee && actor.accessLevel === 'CUSTOM' && actor.employeeId) {
          const assignment = await (this.prisma as any).upward_pm_employee_property.findFirst({
            where: { employeeId: actor.employeeId, propertyId: property.id },
          });
          if (!assignment) {
            throw new ForbiddenException('You do not have access to this property');
          }
        }

        targetPropertyId = property.id;
      } else if (dto.targetType === 'UNIT') {
        if (!dto.targetUnitUuid) {
          throw new BadRequestException('targetUnitUuid is required for linked unit listings');
        }
        if (dto.targetPropertyUuid) {
          throw new BadRequestException('targetPropertyUuid must not be explicitly set for unit listings');
        }

        const unit = await this.prisma.upward_pm_unit.findUnique({
          where: { uuid: dto.targetUnitUuid },
          select: {
            id: true,
            propertyId: true,
            unitName: true,
            rentAmount: true,
            currency: true,
            property: { select: { id: true, pmId: true, name: true, address: true } },
          },
        });

        if (!unit || unit.property.pmId !== pmId) {
          throw new NotFoundException('Canonical unit not found in your inventory');
        }

        if (actor.isEmployee && actor.accessLevel === 'CUSTOM' && actor.employeeId) {
          const assignment = await (this.prisma as any).upward_pm_employee_property.findFirst({
            where: { employeeId: actor.employeeId, propertyId: unit.property.id },
          });
          if (!assignment) {
            throw new ForbiddenException('You do not have access to this unit');
          }
        }

        targetUnitId = unit.id;
      }
    } else if (dto.sourceType === 'INDEPENDENT') {
      if (dto.targetPropertyUuid || dto.targetUnitUuid) {
        throw new BadRequestException('Independent listings must not reference canonical inventory');
      }
    }

    // 3. Create listing in DRAFT status
    const listing = await this.listingRepo.create({
      pmId,
      sourceType: dto.sourceType,
      targetType: dto.targetType,
      intent: dto.intent || 'RENT',
      targetPropertyId,
      targetUnitId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      currency: dto.currency || 'NGN',
      price: dto.price ?? 0,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      country: dto.country?.trim() || 'Nigeria',
      propertyType: dto.propertyType?.trim() || null,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
    });

    // 4. Activity Log
    await this.activityLog.log({
      pmId: actor.ownerPmId,
      employeeId: actor.isEmployee ? actor.employeeId : undefined,
      ownerPmId: pmId,
      action: 'CREATE_ALLIANCE_LISTING',
      entityType: 'ALLIANCE_LISTING',
      entityId: listing.uuid,
      description: `Created Alliance draft listing "${listing.title}" (${listing.targetType}, ${listing.sourceType})`,
      metadata: {
        sourceType: listing.sourceType,
        targetType: listing.targetType,
        intent: listing.intent,
        price: listing.price,
      },
    });

    return listing;
  }
}
