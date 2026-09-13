export interface PmActorContext {
  ownerPmId: number;
  isEmployee: boolean;
  employeeId?: number;
  employeeUuid?: string;
  accessLevel?: 'ALL' | 'CUSTOM' | string;
}
