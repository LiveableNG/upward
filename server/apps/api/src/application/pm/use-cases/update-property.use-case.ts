import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { IApprovalRequestRepository, PM_APPROVAL_REQUEST_REPOSITORY } from '../../../domains/pm/IApprovalRequestRepository';
import { UpdatePropertyDto } from '../dtos/property.dto';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { LandlordService } from '../services/landlord.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class UpdatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: IApprovalRequestRepository,
    private readonly s3Service: S3Service,
    private readonly landlordService: LandlordService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, propertyUuid: string, dto: UpdatePropertyDto) {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.pmId !== pmId) {
      // Check if user is a team collaborator with access to this property
      const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
        where: { collaboratorPmId: pmId, ownerPmId: property.pmId, status: 'ACCEPTED' }
      });

      if (!teamCollab) {
        throw new ForbiddenException('You do not have access to update this property');
      }

      // Manager collaborator: Queue edit request in upward_pm_approval_request
      const approval = await this.approvalRepository.create({
        requesterPmId: pmId,
        ownerPmId: property.pmId,
        type: 'EDIT_PROPERTY',
        propertyUuid,
        propertyName: property.name,
        payload: {
          currentData: {
            name: property.name,
            address: property.address,
            propertyType: property.propertyType,
            totalUnits: property.totalUnits,
          },
          proposedData: dto
        }
      });

      return {
        requiresApproval: true,
        approvalUuid: approval.uuid,
        message: 'Your property edit request has been submitted to the Admin for approval.'
      };
    }

    let landlordId: number | undefined = undefined;
    if (dto.landlordEmail && dto.landlordEmail !== property.landlordEmail) {
        const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: pmId }, select: { uuid: true } });
        const landlord = await this.landlordService.ensureLandlord(
            dto.landlordEmail,
            dto.landlordName,
            dto.landlordPhone,
            pm?.uuid,
        );
        if (landlord && landlord.id) landlordId = landlord.id;
    }

    const updatedProperty = await this.propertyRepository.update(propertyUuid, {
      name: dto.name,
      address: dto.address,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl,
      country: dto.country,
      state: dto.state,
      area: dto.area,
      landlordId,
      landlordName: dto.landlordName,
      landlordEmail: dto.landlordEmail,
      landlordPhone: dto.landlordPhone,
    });

    if (updatedProperty.imageUrl) {
      updatedProperty.imageUrl = await this.s3Service.getDownloadUrl(updatedProperty.imageUrl);
    }

    return updatedProperty;
  }
}
