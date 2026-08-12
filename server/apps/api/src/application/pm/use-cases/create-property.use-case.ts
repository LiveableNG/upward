import { Inject, Injectable, ConflictException } from '@nestjs/common';
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
    // Check for duplicate property name for this PM
    const existing = await this.prisma.upward_pm_property.findFirst({
      where: {
        pmId,
        name: {
          equals: dto.name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      throw new ConflictException(`A property with the name "${dto.name}" already exists in your portfolio.`);
    }

    let landlordId: number | null = null;
    if (dto.landlordEmail) {
      const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: pmId }, select: { uuid: true } });
      const landlord = await this.landlordService.ensureLandlord(
        dto.landlordEmail, 
        dto.landlordName, 
        dto.landlordPhone,
        pm?.uuid,
      );
      if (landlord && landlord.id) {
        landlordId = landlord.id;
      }
    }

    const property = await this.propertyRepository.create({
      pmId,
      name: dto.name,
      address: dto.address || null,
      totalUnits: dto.totalUnits || 0,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl || null,
      country: dto.country || 'Nigeria',
      state: dto.state || null,
      area: dto.area || null,
      landlordId,
      landlordName: dto.landlordName || null,
      landlordEmail: dto.landlordEmail || null,
      landlordPhone: dto.landlordPhone || null,
    });

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
