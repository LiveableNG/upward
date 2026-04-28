import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IPropertyRepository, PropertyEntity } from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmPropertyRepository implements IPropertyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private mapProperty(p: any): PropertyEntity {
    return {
      id: p.id,
      uuid: p.uuid,
      pmId: p.pmId,
      name: p.name,
      address: p.address,
      totalUnits: p.totalUnits,
      propertyType: p.propertyType,
      imageUrl: p.imageUrl,
      country: p.country,
      state: p.state,
      area: p.area,
      landlordName: p.landlordNameEncrypted ? this.encryption.decrypt(p.landlordNameEncrypted) : null,
      landlordEmail: p.landlordEmailEncrypted ? this.encryption.decrypt(p.landlordEmailEncrypted) : null,
      landlordPhone: p.landlordPhoneEncrypted ? this.encryption.decrypt(p.landlordPhoneEncrypted) : null,
    };
  }

  async create(data: Omit<PropertyEntity, 'id' | 'uuid'>): Promise<PropertyEntity> {
    const landlordNameEncrypted = data.landlordName ? this.encryption.encrypt(data.landlordName) : null;
    const landlordNameSearch = data.landlordName?.toLowerCase();
    const landlordEmailEncrypted = data.landlordEmail ? this.encryption.encrypt(data.landlordEmail) : null;
    const landlordEmailHash = data.landlordEmail ? this.encryption.hash(data.landlordEmail) : null;
    const landlordPhoneEncrypted = data.landlordPhone ? this.encryption.encrypt(data.landlordPhone) : null;
    const landlordPhoneHash = data.landlordPhone ? this.encryption.hash(data.landlordPhone) : null;

    const property = await this.prisma.upward_pm_property.create({
      data: {
        pmId: data.pmId,
        name: data.name,
        address: data.address,
        totalUnits: data.totalUnits,
        propertyType: data.propertyType,
        imageUrl: data.imageUrl,
        country: data.country,
        state: data.state,
        area: data.area,
        landlordNameEncrypted,
        landlordNameSearch,
        landlordEmailEncrypted,
        landlordEmailHash,
        landlordPhoneEncrypted,
        landlordPhoneHash,
      },
    });

    return this.mapProperty(property);
  }

  async findByPmId(pmId: number): Promise<PropertyEntity[]> {
    const properties = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
    });
    return properties.map(p => this.mapProperty(p));
  }

  async findById(id: number): Promise<PropertyEntity | null> {
    const property = await this.prisma.upward_pm_property.findUnique({
      where: { id },
    });
    return property ? this.mapProperty(property) : null;
  }

  async findByUuid(uuid: string): Promise<PropertyEntity | null> {
    const property = await this.prisma.upward_pm_property.findUnique({
      where: { uuid },
    });
    return property ? this.mapProperty(property) : null;
  }

  async update(uuid: string, data: Partial<Omit<PropertyEntity, 'id' | 'uuid' | 'pmId'>>): Promise<PropertyEntity> {
    const updateData: any = { ...data };

    if (data.landlordName !== undefined) {
      updateData.landlordNameEncrypted = data.landlordName ? this.encryption.encrypt(data.landlordName) : null;
      updateData.landlordNameSearch = data.landlordName?.toLowerCase();
      delete updateData.landlordName;
    }
    if (data.landlordEmail !== undefined) {
      updateData.landlordEmailEncrypted = data.landlordEmail ? this.encryption.encrypt(data.landlordEmail) : null;
      updateData.landlordEmailHash = data.landlordEmail ? this.encryption.hash(data.landlordEmail) : null;
      delete updateData.landlordEmail;
    }
    if (data.landlordPhone !== undefined) {
      updateData.landlordPhoneEncrypted = data.landlordPhone ? this.encryption.encrypt(data.landlordPhone) : null;
      updateData.landlordPhoneHash = data.landlordPhone ? this.encryption.hash(data.landlordPhone) : null;
      delete updateData.landlordPhone;
    }

    const property = await this.prisma.upward_pm_property.update({
      where: { uuid },
      data: updateData,
    });

    return this.mapProperty(property);
  }

  async delete(uuid: string): Promise<boolean> {
    await this.prisma.upward_pm_property.delete({
      where: { uuid },
    });
    return true;
  }
}
