import { Injectable, Inject } from '@nestjs/common';
import { 
  IApprovalRequestRepository, 
  PM_APPROVAL_REQUEST_REPOSITORY 
} from '../../../../domains/pm/IApprovalRequestRepository';

@Injectable()
export class GetApprovalRequestsUseCase {
  constructor(
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepo: IApprovalRequestRepository,
  ) {}

  async execute(ownerPmId: number) {
    const requests = await this.approvalRepo.findPendingByOwner(ownerPmId);

    return requests.map((req) => {
      const payload = req.payload || {};

      const isUnit = req.type.includes('UNIT');
      const targetName = isUnit ? (req.unitName ? `Unit ${req.unitName}` : 'Unit') : (req.propertyName || 'Property');
      const actionText = req.type.startsWith('EDIT') ? 'Requested edits' : 'Requested deletion';

      return {
        uuid: req.uuid,
        action: req.type,
        entityType: isUnit ? 'UNIT' : 'PROPERTY',
        entityId: req.unitUuid || req.propertyUuid,
        description: `${actionText} for ${targetName}`,
        status: req.status || 'PENDING',
        type: req.type,
        propertyUuid: req.propertyUuid,
        propertyName: req.propertyName,
        unitUuid: req.unitUuid,
        unitName: req.unitName,
        currentData: payload.currentData || null,
        proposedData: payload.proposedData || payload,
        rejectionReason: req.rejectionReason || null,
        createdAt: req.createdAt,
        requester: req.requesterPm || { uuid: '', firstName: '', lastName: '', email: '' }
      };
    });
  }
}
