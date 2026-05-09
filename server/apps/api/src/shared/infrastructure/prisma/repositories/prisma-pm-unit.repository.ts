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

  async create(data: Omit<UnitEntity, 'id' | 'uuid'>): Promise<UnitEntity> {
    const unit = await this.prisma.upward_pm_unit.create({
      data: {
        propertyId: data.propertyId,
        unitName: data.unitName,
        rentAmount: data.rentAmount,
        rentStartDate: data.rentStartDate,
        rentDueDate: data.rentDueDate,
        rentType: data.rentType,
        managementFee: data.managementFee,
        notes: data.notes,
        currency: data.currency,
        status: data.status,
        tenantId: data.tenantId,
        unitType: data.unitType,
      },
      include: { property: true, tenant: true },
    });
    return this.mapUnit(unit);
  }

  async createMany(data: Omit<UnitEntity, 'id' | 'uuid'>[]): Promise<{ count: number }> {
    return this.prisma.upward_pm_unit.createMany({
      data: data.map(unit => ({
        propertyId: unit.propertyId,
        unitName: unit.unitName,
        rentAmount: unit.rentAmount,
        rentStartDate: unit.rentStartDate,
        rentDueDate: unit.rentDueDate,
        rentType: unit.rentType,
        managementFee: unit.managementFee,
        notes: unit.notes,
        currency: unit.currency,
        status: unit.status,
        tenantId: unit.tenantId,
        unitType: unit.unitType,
      })),
    });
  }

  private mapUnit(u: any): UnitEntity {
    return {
      ...u,
      propertyUuid: u.property?.uuid,
      tenant: u.tenant ? {
        id: u.tenant.id,
        uuid: u.tenant.uuid,
        pmId: u.tenant.pmId,
        firstName: u.tenant.firstNameEncrypted ? this.encryption.decrypt(u.tenant.firstNameEncrypted) : null,
        lastName: u.tenant.lastNameEncrypted ? this.encryption.decrypt(u.tenant.lastNameEncrypted) : null,
        email: u.tenant.emailEncrypted ? this.encryption.decrypt(u.tenant.emailEncrypted) : null,
        phone: u.tenant.phoneEncrypted ? this.encryption.decrypt(u.tenant.phoneEncrypted) : null,
        inviteStatus: u.tenant.inviteStatus,
        inviteSentAt: u.tenant.inviteSentAt
      } : null,
      isSynced: u.isSynced,
      userPropertyUuid: u.userPropertyUuid
    } as any;
  }

  async findByUuid(uuid: string): Promise<UnitEntity | null> {
    const unit = await this.prisma.upward_pm_unit.findUnique({
      where: { uuid },
      include: { property: true, tenant: true },
    });
    return unit ? this.mapUnit(unit) : null;
  }

  async findByPropertyId(propertyId: number): Promise<UnitEntity[]> {
    const units = await this.prisma.upward_pm_unit.findMany({
      where: { propertyId },
      include: { property: true, tenant: true },
      orderBy: { unitName: 'asc' },
    });
    return units.map(u => this.mapUnit(u));
  }

  async findByPmId(pmId: number): Promise<UnitEntity[]> {
    const units = await this.prisma.upward_pm_unit.findMany({
      where: {
        property: { pmId },
      },
      include: { property: true, tenant: true },
      orderBy: { unitName: 'asc' },
    });
    return units.map(u => this.mapUnit(u));
  }

  async update(uuid: string, data: any): Promise<UnitEntity> {
    const allowedFields = [
      'unitName', 'rentAmount', 'rentStartDate', 'rentDueDate', 
      'rentType', 'managementFee', 'notes', 'currency', 'status', 'tenantId',
      'isSynced', 'userPropertyUuid', 'unitType'
    ];
    
    const updateData: any = {};
    
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (updateData.rentStartDate) {
      updateData.rentStartDate = new Date(updateData.rentStartDate);
    }
    if (updateData.rentDueDate) {
      updateData.rentDueDate = new Date(updateData.rentDueDate);
    }

    const propertyFields = ['address', 'state', 'country', 'area'];
    const propertyUpdate: any = {};
    let hasPropertyUpdate = false;

    for (const key of propertyFields) {
      if (data[key] !== undefined) {
        propertyUpdate[key] = data[key];
        hasPropertyUpdate = true;
      }
    }

    if (hasPropertyUpdate) {
      updateData.property = {
        update: propertyUpdate
      };
    }

    const unit = await this.prisma.upward_pm_unit.update({
      where: { uuid },
      data: updateData,
      include: { property: true, tenant: true }
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
