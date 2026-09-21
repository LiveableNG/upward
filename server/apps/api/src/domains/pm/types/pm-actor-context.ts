export interface PmActorContext {
  ownerPmId: number;
  ownerPmUuid?: string;
  isEmployee: boolean;
  employeeId?: number;
  employeeUuid?: string;
  accessLevel?: 'ALL' | 'CUSTOM' | string;
}
