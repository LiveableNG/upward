export const PM_APPROVAL_REQUEST_REPOSITORY = Symbol('PM_APPROVAL_REQUEST_REPOSITORY');

export interface CreateApprovalRequestInput {
  requesterPmId: number;
  ownerPmId: number;
  type: 'EDIT_PROPERTY' | 'DELETE_PROPERTY' | 'EDIT_UNIT' | 'DELETE_UNIT';
  propertyUuid?: string;
  propertyName?: string;
  unitUuid?: string;
  unitName?: string;
  payload: any;
}

export interface ApprovalRequest {
  id: number;
  uuid: string;
  ownerPmId: number;
  requesterPmId: number;
  propertyUuid?: string | null;
  propertyName?: string | null;
  unitUuid?: string | null;
  unitName?: string | null;
  type: string;
  status: string;
  payload?: any;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  requesterPm?: {
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface IApprovalRequestRepository {
  create(input: CreateApprovalRequestInput): Promise<ApprovalRequest>;
  findByUuid(uuid: string): Promise<ApprovalRequest | null>;
  findPendingByOwner(ownerPmId: number): Promise<ApprovalRequest[]>;
  updateStatus(uuid: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<ApprovalRequest>;
}
