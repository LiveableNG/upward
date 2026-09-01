import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  IApprovalRequestRepository, 
  PM_APPROVAL_REQUEST_REPOSITORY 
} from '../../../../domains/pm/IApprovalRequestRepository';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY, IUnitRepository, PM_UNIT_REPOSITORY } from '../../../../domains/pm/IPropertyRepository';
import { UpdateUnitUseCase } from '../update-unit.use-case';

@Injectable()
export class ResolveApprovalRequestUseCase {
  constructor(
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepo: IApprovalRequestRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepo: IPropertyRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
  ) {}

  async execute(ownerPmId: number, requestUuid: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const request = await this.approvalRepo.findByUuid(requestUuid);

    if (!request || request.ownerPmId !== ownerPmId) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`This request has already been ${request.status.toLowerCase()}.`);
    }

    if (action === 'REJECT') {
      await this.approvalRepo.updateStatus(requestUuid, 'REJECTED', rejectionReason || 'Request rejected by Admin');
      return {
        success: true,
        message: 'Approval request rejected.'
      };
    }

    // Handle APPROVE
    if (request.type === 'EDIT_PROPERTY') {
      if (!request.propertyUuid) {
        throw new NotFoundException('Target property UUID missing in request');
      }

      const property = await this.propertyRepo.findByUuid(request.propertyUuid);
      if (!property) {
        throw new NotFoundException('Target property no longer exists');
      }

      const payload = request.payload || {};
      const dto = payload.proposedData || payload;
      await this.propertyRepo.update(request.propertyUuid, {
        name: dto.name,
        address: dto.address,
        totalUnits: dto.totalUnits,
        propertyType: dto.propertyType,
        imageUrl: dto.imageUrl,
        country: dto.country,
        state: dto.state,
        area: dto.area,
        landlordName: dto.landlordName,
        landlordEmail: dto.landlordEmail,
        landlordPhone: dto.landlordPhone,
      });

      await this.approvalRepo.updateStatus(requestUuid, 'APPROVED');

      return {
        success: true,
        message: `Property edits for "${request.propertyName}" approved and applied.`
      };
    }

    if (request.type === 'DELETE_PROPERTY') {
      if (!request.propertyUuid) {
        throw new NotFoundException('Target property UUID missing in request');
      }

      const property = await this.propertyRepo.findByUuid(request.propertyUuid);
      if (property) {
        await this.propertyRepo.delete(request.propertyUuid);
      }

      await this.approvalRepo.updateStatus(requestUuid, 'APPROVED');

      return {
        success: true,
        message: `Deletion request for "${request.propertyName}" approved and property removed.`
      };
    }

    if (request.type === 'EDIT_UNIT') {
      const targetUnitUuid = request.unitUuid || request.payload?.unitUuid;
      if (!targetUnitUuid) {
        throw new NotFoundException('Target unit UUID missing in request');
      }

      const payload = request.payload || {};
      const dto = payload.proposedData || payload;
      await this.updateUnitUseCase.execute(ownerPmId, targetUnitUuid, dto);

      await this.approvalRepo.updateStatus(requestUuid, 'APPROVED');

      const targetUnitName = request.unitName || request.payload?.unitName || 'Unit';
      return {
        success: true,
        message: `Unit edits for "${targetUnitName}" approved and applied.`
      };
    }

    if (request.type === 'DELETE_UNIT') {
      const targetUnitUuid = request.unitUuid || request.payload?.unitUuid;
      if (!targetUnitUuid) {
        throw new NotFoundException('Target unit UUID missing in request');
      }

      await this.unitRepo.delete(targetUnitUuid);

      await this.approvalRepo.updateStatus(requestUuid, 'APPROVED');

      const targetUnitName = request.unitName || request.payload?.unitName || 'Unit';
      return {
        success: true,
        message: `Deletion request for unit "${targetUnitName}" approved.`
      };
    }

    throw new BadRequestException('Unsupported approval request type');
  }
}
