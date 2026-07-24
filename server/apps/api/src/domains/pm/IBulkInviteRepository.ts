
export const BULK_INVITE_REPOSITORY = Symbol('BULK_INVITE_REPOSITORY');

export interface BulkInviteItem {
  id?: string;
  bulkInviteId?: string;
  tenantUuid: string;
  status: string;
  error?: string;
  retries: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BulkInvite {
  id?: string;
  pmId: number;
  status: string;
  totalTenants: number;
  sentCount: number;
  failedCount: number;
  error?: string;
  channel?: string;
  items?: BulkInviteItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBulkInviteRepository {
  create(data: Omit<BulkInvite, 'id' | 'createdAt' | 'updatedAt'>): Promise<BulkInvite>;
  update(id: string, data: Partial<BulkInvite>): Promise<BulkInvite>;
  findById(id: string): Promise<BulkInvite | null>;
  findPending(): Promise<BulkInvite[]>;
  updateItem(itemId: string, data: Partial<BulkInviteItem>): Promise<BulkInviteItem>;
  createItem(data: Omit<BulkInviteItem, 'id'>): Promise<BulkInviteItem>;
}
