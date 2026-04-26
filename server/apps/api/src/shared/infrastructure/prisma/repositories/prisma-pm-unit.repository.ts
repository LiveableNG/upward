import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IUnitRepository, UnitEntity, RentPaymentEntity } from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmUnitRepository implements IUnitRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async createMany(data: Omit<UnitEntity, 'id' | 'uuid'>[]): Promise<{ count: number }> {
    return this.prisma.upward_pm_unit.createMany({
      data: data.map(unit => ({
        propertyId: unit.propertyId,
        unitName: unit.unitName,
        tenantFirstNameEncrypted: unit.tenantFirstNameEncrypted,
        tenantFirstNameSearch: unit.tenantFirstNameSearch,
        tenantLastNameEncrypted: unit.tenantLastNameEncrypted,
        tenantLastNameSearch: unit.tenantLastNameSearch,
        tenantEmailEncrypted: unit.tenantEmailEncrypted,
        tenantEmailHash: unit.tenantEmailHash,
        tenantPhoneEncrypted: unit.tenantPhoneEncrypted,
        tenantPhoneHash: unit.tenantPhoneHash,
        rentAmount: unit.rentAmount,
        rentStartDate: unit.rentStartDate,
        rentDueDate: unit.rentDueDate,
        rentFrequency: unit.rentFrequency,
        currency: unit.currency,
        status: unit.status,
      })),
    });
  }

  private mapUnit(u: any): UnitEntity {
    return {
      ...u,
      propertyUuid: u.property?.uuid,
      tenantFirstName: u.tenantFirstNameEncrypted ? this.encryption.decrypt(u.tenantFirstNameEncrypted) : null,
      tenantLastName: u.tenantLastNameEncrypted ? this.encryption.decrypt(u.tenantLastNameEncrypted) : null,
      tenantEmail: u.tenantEmailEncrypted ? this.encryption.decrypt(u.tenantEmailEncrypted) : null,
      tenantPhone: u.tenantPhoneEncrypted ? this.encryption.decrypt(u.tenantPhoneEncrypted) : null,
    } as any;
  }

  async findByPropertyId(propertyId: number): Promise<UnitEntity[]> {
    const units = await this.prisma.upward_pm_unit.findMany({
      where: { propertyId },
      include: { property: true },
      orderBy: { unitName: 'asc' },
    });
    return units.map(u => this.mapUnit(u));
  }

  async findByPmId(pmId: number): Promise<UnitEntity[]> {
    const units = await this.prisma.upward_pm_unit.findMany({
      where: {
        property: { pmId },
      },
      include: { property: true },
      orderBy: { unitName: 'asc' },
    });
    return units.map(u => this.mapUnit(u));
  }

  async update(uuid: string, data: any): Promise<UnitEntity> {
    const updateData: any = { ...data };
    
    if (data.tenantFirstName) {
      updateData.tenantFirstNameEncrypted = this.encryption.encrypt(data.tenantFirstName);
      updateData.tenantFirstNameSearch = data.tenantFirstName.toLowerCase();
      delete updateData.tenantFirstName;
    }
    if (data.tenantLastName) {
      updateData.tenantLastNameEncrypted = this.encryption.encrypt(data.tenantLastName);
      updateData.tenantLastNameSearch = data.tenantLastName.toLowerCase();
      delete updateData.tenantLastName;
    }
    if (data.tenantEmail) {
      updateData.tenantEmailEncrypted = this.encryption.encrypt(data.tenantEmail);
      updateData.tenantEmailHash = this.encryption.hash(data.tenantEmail);
      delete updateData.tenantEmail;
    }
    if (data.tenantPhone) {
      updateData.tenantPhoneEncrypted = this.encryption.encrypt(data.tenantPhone);
      updateData.tenantPhoneHash = this.encryption.hash(data.tenantPhone);
      delete updateData.tenantPhone;
    }

    if (data.rentStartDate) {
      updateData.rentStartDate = new Date(data.rentStartDate);
    }
    if (data.rentDueDate) {
      updateData.rentDueDate = new Date(data.rentDueDate);
    }

    const unit = await this.prisma.upward_pm_unit.update({
      where: { uuid },
      data: updateData,
      include: { property: true }
    });

    return this.mapUnit(unit);
  }

  async delete(uuid: string): Promise<boolean> {
    await this.prisma.upward_pm_unit.delete({
      where: { uuid }
    });
    return true;
  }

  async getRentPayments(unitUuid: string): Promise<RentPaymentEntity[]> {
    return this.prisma.upward_pm_rent_payment.findMany({
      where: { unit: { uuid: unitUuid } },
      orderBy: { paymentDate: 'desc' }
    });
  }

  async addRentPayment(unitUuid: string, data: any): Promise<RentPaymentEntity> {
    const unit = await this.prisma.upward_pm_unit.findUnique({
      where: { uuid: unitUuid }
    });
    if (!unit) throw new Error('Unit not found');

    return this.prisma.upward_pm_rent_payment.create({
      data: {
        ...data,
        unitId: unit.id
      }
    });
  }
}
