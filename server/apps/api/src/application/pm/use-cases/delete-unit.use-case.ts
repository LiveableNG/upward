import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { IApprovalRequestRepository, PM_APPROVAL_REQUEST_REPOSITORY } from '../../../domains/pm/IApprovalRequestRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class DeleteUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: IApprovalRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string) {
    const unitRecord = await this.prisma.upward_pm_unit.findUnique({
      where: { uuid },
      include: { property: true }
    });
    
    if (!unitRecord) {
      throw new NotFoundException('Unit not found');
    }

    const property = unitRecord.property;
    if (property.pmId !== pmId) {
      const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
        where: { collaboratorPmId: pmId, ownerPmId: property.pmId, status: 'ACCEPTED' }
      });

      if (!teamCollab) {
        throw new ForbiddenException('You do not have access to delete this unit');
      }

      // Manager collaborator: Queue deletion request in upward_pm_approval_request
      const approval = await this.approvalRepository.create({
        requesterPmId: pmId,
        ownerPmId: property.pmId,
        type: 'DELETE_UNIT',
        propertyUuid: property.uuid,
        propertyName: property.name,
        unitUuid: uuid,
        unitName: unitRecord.unitName,
        payload: {
          rentAmount: unitRecord.rentAmount
        }
      });

      return {
        requiresApproval: true,
        approvalUuid: approval.uuid,
        message: 'Your unit deletion request has been submitted to the Admin for approval.'
      };
    }

    return this.unitRepository.delete(uuid);
  }
}
