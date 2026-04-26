export const PM_PROPERTY_REPOSITORY = Symbol('PM_PROPERTY_REPOSITORY');
export const PM_UNIT_REPOSITORY = Symbol('PM_UNIT_REPOSITORY');

export interface PropertyEntity {
  id: number;
  uuid: string;
  pmId: number;
  name: string;
  address: string | null;
  totalUnits: number;
  propertyType: string;
  imageUrl: string | null;
}

export interface UnitEntity {
  id: number;
  uuid: string;
  propertyId: number;
  propertyUuid?: string;
  property?: PropertyEntity;
  unitName: string;
  tenantFirstNameEncrypted: string | null;
  tenantFirstNameSearch: string | null;
  tenantLastNameEncrypted: string | null;
  tenantLastNameSearch: string | null;
  tenantEmailEncrypted: string | null;
  tenantEmailHash: string | null;
  tenantPhoneEncrypted: string | null;
  tenantPhoneHash: string | null;
  // Plain fields (decrypted)
  tenantFirstName?: string | null;
  tenantLastName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  rentAmount: number;
  rentStartDate: Date | null;
  rentDueDate: Date | null;
  rentFrequency: string;
  currency: string;
  status: string;
}

export interface IPropertyRepository {
  create(data: Omit<PropertyEntity, 'id' | 'uuid'>): Promise<PropertyEntity>;
  findByPmId(pmId: number): Promise<PropertyEntity[]>;
  findById(id: number): Promise<PropertyEntity | null>;
  findByUuid(uuid: string): Promise<PropertyEntity | null>;
  update(uuid: string, data: Partial<Omit<PropertyEntity, 'id' | 'uuid' | 'pmId'>>): Promise<PropertyEntity>;
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
  findByPmId(pmId: number): Promise<UnitEntity[]>;
  update(uuid: string, data: Partial<Omit<UnitEntity, 'id' | 'uuid' | 'propertyId'>>): Promise<UnitEntity>;
  delete(uuid: string): Promise<boolean>;
  
  // Rent Payments
  getRentPayments(unitUuid: string): Promise<RentPaymentEntity[]>;
  addRentPayment(unitUuid: string, data: Omit<RentPaymentEntity, 'id' | 'uuid' | 'unitId'>): Promise<RentPaymentEntity>;
}
