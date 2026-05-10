import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { CreatePropertyDto } from '../dtos/property.dto';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { LandlordService } from '../services/landlord.service';

@Injectable()
export class CreatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly landlordService: LandlordService,
  ) {}

  async execute(pmId: number, dto: CreatePropertyDto) {
    const property = await this.propertyRepository.create({
      pmId,
      name: dto.name,
      address: dto.address || null,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl || null,
      country: dto.country || 'Nigeria',
      state: dto.state || null,
      area: dto.area || null,
      landlordName: dto.landlordName || null,
      landlordEmail: dto.landlordEmail || null,
      landlordPhone: dto.landlordPhone || null,
    });

    if (dto.landlordEmail) {
      await this.landlordService.ensureLandlord(
        dto.landlordEmail, 
        dto.landlordName, 
        dto.landlordPhone
      );
    }

    if (dto.collaboratorUuids && dto.collaboratorUuids.length > 0) {
        const collaborators = await (this.prisma as any).upward_property_manager.findMany({
            where: { uuid: { in: dto.collaboratorUuids } },
            select: { id: true }
        });

        if (collaborators.length > 0) {
            await (this.prisma as any).upward_pm_property_collaboration.createMany({
                data: collaborators.map((c: any) => ({
                    propertyId: property.id,
                    collaboratorPmId: c.id,
                    ownerPmId: pmId
                }))
            });
        }
    }

    await this.activityLog.log({
        pmId,
        ownerPmId: pmId, 
        action: ActivityAction.CREATE_PROPERTY,
        entityType: 'PROPERTY',
        entityId: property.uuid,
        description: `Created property: ${property.name}`,
    });

    if (property.imageUrl) {
      property.imageUrl = await this.s3Service.getDownloadUrl(property.imageUrl);
    }

    return property;
  }
}
