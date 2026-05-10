export const PM_LANDLORD_REPOSITORY = Symbol('PM_LANDLORD_REPOSITORY');

export interface LandlordEntity {
  id?: number;
  uuid: string;
  email: string;
  emailHash: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  mustChangePassword: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILandlordRepository {
  findByEmail(email: string): Promise<LandlordEntity | null>;
  findByUuid(uuid: string): Promise<LandlordEntity | null>;
  create(data: LandlordEntity): Promise<LandlordEntity>;
  update(uuid: string, data: Partial<LandlordEntity>): Promise<LandlordEntity>;
  save(landlord: LandlordEntity): Promise<LandlordEntity>;
}
