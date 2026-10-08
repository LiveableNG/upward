export const SETTLEMENT_ACCOUNT_REPOSITORY = Symbol('SETTLEMENT_ACCOUNT_REPOSITORY');

export interface SettlementAccountEntity {
  id: number;
  uuid: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  pmId?: number | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  pmProperties?: { id: number; uuid: string; name: string }[];
}

export interface CreateSettlementAccountData {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
  pmId: number;
  isPrimary?: boolean;
}

export interface UpdateSettlementAccountData {
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
  isPrimary?: boolean;
}

export interface ISettlementAccountRepository {
  findByPmId(pmId: number): Promise<SettlementAccountEntity[]>;
  findByUuid(uuid: string): Promise<SettlementAccountEntity | null>;
  findById(id: number): Promise<SettlementAccountEntity | null>;
  findPrimaryByPmId(pmId: number): Promise<SettlementAccountEntity | null>;
  create(data: CreateSettlementAccountData): Promise<SettlementAccountEntity>;
  update(id: number, data: UpdateSettlementAccountData): Promise<SettlementAccountEntity>;
  delete(id: number): Promise<boolean>;
  setPrimary(id: number, pmId: number): Promise<SettlementAccountEntity>;
  linkProperties(accountId: number, pmId: number, propertyUuids: string[]): Promise<boolean>;
}
