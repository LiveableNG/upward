import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  IAllianceListingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetAllianceListingUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(listingUuid: string, actor: PmActorContext) {
    const listing = await this.listingRepo.findByUuid(listingUuid);
    if (!listing || listing.pmId !== actor.ownerPmId) {
      throw new NotFoundException('Alliance listing not found');
    }

    // If employee with CUSTOM access and linked inventory, verify property assignment
    if (actor.isEmployee && actor.accessLevel === 'CUSTOM' && actor.employeeId) {
      if (listing.targetPropertyId) {
        const assignment = await (this.prisma as any).upward_pm_employee_property.findFirst({
          where: { employeeId: actor.employeeId, propertyId: listing.targetPropertyId },
        });
        if (!assignment) {
          throw new ForbiddenException('You do not have access to this listing');
        }
      } else if (listing.targetUnitId) {
        const unit = await this.prisma.upward_pm_unit.findUnique({
          where: { id: listing.targetUnitId },
          select: { propertyId: true },
        });
        if (unit) {
          const assignment = await (this.prisma as any).upward_pm_employee_property.findFirst({
            where: { employeeId: actor.employeeId, propertyId: unit.propertyId },
          });
          if (!assignment) {
            throw new ForbiddenException('You do not have access to this listing');
          }
        }
      }
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
