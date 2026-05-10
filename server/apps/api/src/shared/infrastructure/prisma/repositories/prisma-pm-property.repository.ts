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

  async findAccessibleByPmId(pmId: number): Promise<PropertyEntity[]> {
    // 1. Get owned properties
    const ownedProperties = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Get collaborations
    const collaborations = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { 
        collaboratorPmId: pmId,
        status: 'ACCEPTED'
      },
    });

    const collabProperties: any[] = [];

    for (const collab of collaborations) {
      if (collab.accessLevel === 'ALL') {
        const ownerProps = await this.prisma.upward_pm_property.findMany({
          where: { pmId: collab.ownerPmId },
        });
        collabProperties.push(...ownerProps);
      } else {
        const customProps = await (this.prisma as any).upward_pm_property_collaboration.findMany({
          where: { 
            collaboratorPmId: pmId,
            ownerPmId: collab.ownerPmId 
          },
          include: { property: true }
        });
        collabProperties.push(...customProps.map((cp: any) => cp.property));
      }
    }

    // 3. Combine and deduplicate
    const allProperties = [...ownedProperties, ...collabProperties];
    const uniqueProperties = Array.from(new Map(allProperties.map(p => [p.id, p])).values());

    // Sort by createdAt desc
    uniqueProperties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return uniqueProperties.map(p => this.mapProperty(p));
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

  async hasAccessToProperty(pmId: number, propertyId: number): Promise<boolean> {
    const property = await this.prisma.upward_pm_property.findUnique({
      where: { id: propertyId }
    });

    if (!property) return false;
    if (property.pmId === pmId) return true;

    // Check team collaboration (ALL access)
    const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId: property.pmId,
          collaboratorPmId: pmId
        }
      }
    });

    if (teamCollab && teamCollab.status === 'ACCEPTED' && teamCollab.accessLevel === 'ALL') {
      return true;
    }

    // Check specific property collaboration
    const propertyCollab = await (this.prisma as any).upward_pm_property_collaboration.findUnique({
      where: {
        propertyId_collaboratorPmId: {
          propertyId,
          collaboratorPmId: pmId
        }
      }
    });

    return !!propertyCollab;
  }

  async delete(uuid: string): Promise<boolean> {
    await this.prisma.upward_pm_property.delete({
      where: { uuid },
    });
    return true;
  }
}
