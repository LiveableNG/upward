export const SPLIT_PROFILE_REPOSITORY = Symbol('SPLIT_PROFILE_REPOSITORY');

export interface SplitProfileItemEntity {
  id?: number;
  uuid?: string;
  profileId?: number;
  manualAccountId: number;
  manualAccountUuid?: string;
  percentage: number;
  lineItemName: string;
  manualAccount?: {
    id: number;
    uuid: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode?: string | null;
    isPrimary?: boolean;
    title?: string | null;
  } | null;
}

export interface SplitProfileEntity {
  id: number;
  uuid: string;
  pmId: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: SplitProfileItemEntity[];
  propertiesCount?: number;
  properties?: Array<{
    id: number;
    uuid: string;
    name: string;
    address: string | null;
  }>;
}

export interface CreateSplitProfileData {
  pmId: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  items: Array<{
    manualAccountId: number;
    percentage: number;
    lineItemName?: string;
  }>;
  propertyUuids?: string[];
}

export interface UpdateSplitProfileData {
  name?: string;
  description?: string;
  isDefault?: boolean;
  items?: Array<{
    manualAccountId: number;
    percentage: number;
    lineItemName?: string;
  }>;
}

export interface ISplitProfileRepository {
  findByPmId(pmId: number): Promise<SplitProfileEntity[]>;
  findByUuid(uuid: string): Promise<SplitProfileEntity | null>;
  findById(id: number): Promise<SplitProfileEntity | null>;
  create(data: CreateSplitProfileData): Promise<SplitProfileEntity>;
  update(id: number, data: UpdateSplitProfileData): Promise<SplitProfileEntity>;
  delete(id: number): Promise<boolean>;
  attachToProperties(profileId: number, pmId: number, propertyUuids: string[]): Promise<boolean>;
  detachProperty(propertyUuid: string, pmId: number): Promise<boolean>;
}
