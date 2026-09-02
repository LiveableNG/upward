import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { IApprovalRequestRepository, PM_APPROVAL_REQUEST_REPOSITORY } from '../../../domains/pm/IApprovalRequestRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class DeletePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: IApprovalRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, propertyUuid: string) {
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
        throw new ForbiddenException('You do not have access to delete this property');
      }

      // Manager collaborator: Queue deletion request in upward_pm_approval_request
      const approval = await this.approvalRepository.create({
        requesterPmId: pmId,
        ownerPmId: property.pmId,
        type: 'DELETE_PROPERTY',
        propertyUuid,
        propertyName: property.name,
        payload: {
          address: property.address
        }
      });

      return {
        requiresApproval: true,
        approvalUuid: approval.uuid,
        message: 'Your property deletion request has been submitted to the Admin for approval.'
      };
    }

    return this.propertyRepository.delete(propertyUuid);
  }
}
