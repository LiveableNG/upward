export const PM_PROPERTY_REPOSITORY = Symbol('PM_PROPERTY_REPOSITORY');
export const PM_UNIT_REPOSITORY = Symbol('PM_UNIT_REPOSITORY');
export const PM_PAYMENT_REQUEST_REPOSITORY = Symbol('PM_PAYMENT_REQUEST_REPOSITORY');

export interface PropertyEntity {
  id: number;
  uuid: string;
  pmId: number;
  name: string;
  address: string | null;
  totalUnits: number;
  propertyType: string;
  imageUrl: string | null;
  country: string;
  state: string | null;
  area: string | null;
}

export interface UnitEntity {
  id: number;
  uuid: string;
  propertyId: number;
  propertyUuid?: string;
  property?: PropertyEntity;
  unitName: string;
  rentAmount: number;
  rentStartDate: Date | null;
  rentDueDate: Date | null;
  rentFrequency: string;
  currency: string;
  status: string;
  tenantId: number | null;
  tenant?: TenantEntity;
  isSynced: boolean;
  userPropertyUuid: string | null;
}

export interface TenantEntity {
  id: number;
  uuid: string;
  pmId: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  inviteStatus: string;
  inviteSentAt: Date | null;
  units?: UnitEntity[];
}

export interface IPropertyRepository {
  create(data: Omit<PropertyEntity, 'id' | 'uuid'>): Promise<PropertyEntity>;
  findByPmId(pmId: number): Promise<PropertyEntity[]>;
  findById(id: number): Promise<PropertyEntity | null>;
  findByUuid(uuid: string): Promise<PropertyEntity | null>;
  update(uuid: string, data: Partial<Omit<PropertyEntity, 'id' | 'uuid' | 'pmId'>>): Promise<PropertyEntity>;
  delete(uuid: string): Promise<boolean>;
}

export interface RentPaymentEntity {
  id: number;
  uuid: string;
  unitId: number;
  amount: number;
  paymentDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  method: string;
  reference: string | null;
  status: string;
  notes: string | null;
}

export interface IUnitRepository {
  createMany(data: Omit<UnitEntity, 'id' | 'uuid'>[]): Promise<{ count: number }>;
  findByPropertyId(propertyId: number): Promise<UnitEntity[]>;
  findByUuid(uuid: string): Promise<UnitEntity | null>;
  findByPmId(pmId: number): Promise<UnitEntity[]>;
  update(uuid: string, data: Partial<Omit<UnitEntity, 'id' | 'uuid' | 'propertyId'>>): Promise<UnitEntity>;
  delete(uuid: string): Promise<boolean>;
  
  // Rent Payments
  getRentPayments(unitUuid: string): Promise<RentPaymentEntity[]>;
  addRentPayment(unitUuid: string, data: Omit<RentPaymentEntity, 'id' | 'uuid' | 'unitId'>): Promise<RentPaymentEntity>;
}

export const PM_TENANT_REPOSITORY = Symbol('PM_TENANT_REPOSITORY');

export interface ITenantRepository {
  findByPmId(pmId: number): Promise<TenantEntity[]>;
  findById(id: number): Promise<TenantEntity | null>;
  findByUuid(uuid: string): Promise<TenantEntity | null>;
  findByEmailHash(pmId: number, emailHash: string): Promise<TenantEntity | null>;
  create(data: Omit<TenantEntity, 'id' | 'uuid'>): Promise<TenantEntity>;
  update(uuid: string, data: Partial<Omit<TenantEntity, 'id' | 'uuid' | 'pmId'>>): Promise<TenantEntity>;
}

export interface PmPaymentRequestEntity {
  id: number;
  uuid: string;
  pmId: number;
  unitId: number;
  tenantId: number | null;
  paymentRequestId: number | null;
  coreRequestUuid?: string | null;
  amount: number;
  currency: string;
  description: string | null;
  dueDate: Date;
  status: string;
  amountPaid: number;
  allowPartial: boolean;
  minAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  
  unit?: UnitEntity;
  tenant?: TenantEntity;
}

export interface IPmPaymentRequestRepository {
  create(data: Omit<PmPaymentRequestEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<PmPaymentRequestEntity>;
  findByPmId(pmId: number): Promise<PmPaymentRequestEntity[]>;
  findByUuid(uuid: string): Promise<PmPaymentRequestEntity | null>;
  findByPaymentRequestId(paymentRequestId: number, tx?: any): Promise<PmPaymentRequestEntity | null>;
  update(uuid: string, data: Partial<PmPaymentRequestEntity>, tx?: any): Promise<PmPaymentRequestEntity>;
}
