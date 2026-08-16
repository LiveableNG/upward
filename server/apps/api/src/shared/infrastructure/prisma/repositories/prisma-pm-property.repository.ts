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
      landlordId: p.landlordId || null,
      landlordName: p.landlord?.firstName ? this.encryption.decrypt(p.landlord.firstName) + (p.landlord.lastName ? ' ' + this.encryption.decrypt(p.landlord.lastName) : '') : null,
      landlordEmail: p.landlord?.email ? this.encryption.decrypt(p.landlord.email) : null,
      landlordPhone: p.landlord?.phone ? this.encryption.decrypt(p.landlord.phone) : null,
      manualAccountId: p.manualAccountId || null,
      manualAccount: p.manualAccount ? {
        id: p.manualAccount.id,
        uuid: p.manualAccount.uuid,
        accountNumber: p.manualAccount.accountNumber,
        accountName: p.manualAccount.accountName,
        bankName: p.manualAccount.bankName,
        bankCode: p.manualAccount.bankCode,
        isPrimary: p.manualAccount.isPrimary,
      } : null,
    };
  }

  async create(data: Omit<PropertyEntity, 'id' | 'uuid'>): Promise<PropertyEntity> {
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
        landlordId: data.landlordId || undefined,
      },
      include: { landlord: true, manualAccount: true },
    });

    return this.mapProperty(property);
  }

  async findByPmId(pmId: number): Promise<PropertyEntity[]> {
    const properties = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
      include: { landlord: true, manualAccount: true },
    });
    return properties.map(p => this.mapProperty(p));
  }

  async findAccessibleByPmId(pmId: number): Promise<PropertyEntity[]> {
    // 1. Get owned properties
    const ownedProperties = await this.prisma.upward_pm_property.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
      include: { landlord: true, manualAccount: true },
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
          include: { landlord: true, manualAccount: true },
        });
        collabProperties.push(...ownerProps);
      } else {
        const customProps = await (this.prisma as any).upward_pm_property_collaboration.findMany({
          where: { 
            collaboratorPmId: pmId,
            ownerPmId: collab.ownerPmId 
          },
          include: { property: { include: { landlord: true, manualAccount: true } } }
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
      include: { landlord: true, manualAccount: true },
    });
    return property ? this.mapProperty(property) : null;
  }

  async findByUuid(uuid: string): Promise<PropertyEntity | null> {
    const property = await this.prisma.upward_pm_property.findUnique({
      where: { uuid },
      include: { landlord: true, manualAccount: true },
    });
    return property ? this.mapProperty(property) : null;
  }

  async update(uuid: string, data: Partial<Omit<PropertyEntity, 'id' | 'uuid' | 'pmId'>>): Promise<PropertyEntity> {
    const updateData: any = { ...data };

    delete updateData.landlordName;
    delete updateData.landlordEmail;
    delete updateData.landlordPhone;

    const property = await this.prisma.upward_pm_property.update({
      where: { uuid },
      data: updateData,
      include: { landlord: true, manualAccount: true },
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
