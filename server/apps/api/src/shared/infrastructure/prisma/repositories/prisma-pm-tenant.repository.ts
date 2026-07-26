import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ITenantRepository, TenantEntity, UnitEntity } from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmTenantRepository implements ITenantRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private mapTenant(t: any): TenantEntity {
    return {
      id: t.id,
      uuid: t.uuid,
      pmId: t.pmId,
      commercialName: t.commercialNameEncrypted ? this.encryption.decrypt(t.commercialNameEncrypted) : null,
      firstName: t.firstNameEncrypted ? this.encryption.decrypt(t.firstNameEncrypted) : null,
      lastName: t.lastNameEncrypted ? this.encryption.decrypt(t.lastNameEncrypted) : null,
      email: t.emailEncrypted ? this.encryption.decrypt(t.emailEncrypted) : null,
      phone: t.phoneEncrypted ? this.encryption.decrypt(t.phoneEncrypted) : null,
      otherPhone: t.otherPhoneEncrypted ? this.encryption.decrypt(t.otherPhoneEncrypted) : null,
      formerAddress: t.formerAddress,
      nextOfKinName: t.nextOfKinName,
      nextOfKinEmail: t.nextOfKinEmail,
      nextOfKinPhone: t.nextOfKinPhone,
      guarantorName: t.guarantorName,
      guarantorEmail: t.guarantorEmail,
      guarantorPhone: t.guarantorPhone,
      emergencyContactName: t.emergencyContactName,
      emergencyContactEmail: t.emergencyContactEmail,
      emergencyContactPhone: t.emergencyContactPhone,
      inviteStatus: t.inviteStatus,
      inviteSentAt: t.inviteSentAt,
      channel: t.channel,
      units: t.units ? t.units.map((u: any) => ({
        id: u.id,
        uuid: u.uuid,
        propertyId: u.propertyId,
        unitName: u.unitName,
        property: u.property ? {
          id: u.property.id,
          uuid: u.property.uuid,
          pmId: u.property.pmId,
          name: u.property.name,
          address: u.property.address,
          totalUnits: u.property.totalUnits,
          propertyType: u.property.propertyType,
          imageUrl: u.property.imageUrl,
          country: u.property.country,
          state: u.property.state,
          area: u.property.area
        } : undefined,
        rentAmount: u.rentAmount,
        rentStartDate: u.rentStartDate,
        rentDueDate: u.rentDueDate,
        rentType: u.rentType,
        currency: u.currency,
        status: u.status,
        isSynced: u.isSynced,
        userPropertyUuid: u.userPropertyUuid,
        tenantId: u.tenantId
      })) : []
    };
  }

  async findByPmId(pmId: number): Promise<TenantEntity[]> {
    const tenants = await this.prisma.upward_pm_tenant.findMany({
      where: { pmId },
      include: { 
        units: {
          include: { property: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return tenants.map(t => this.mapTenant(t));
  }

  async findAccessibleByPmId(pmId: number): Promise<TenantEntity[]> {
    // Team collaborations (ALL access)
    const teamCollabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { collaboratorPmId: pmId, status: 'ACCEPTED', accessLevel: 'ALL' }
    });
    
    const ownerPmIds = teamCollabs.map((tc: any) => tc.ownerPmId);
    
    // Custom property collaborations
    const propCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
      where: { collaboratorPmId: pmId }
    });
    
    const collabPropertyIds = propCollabs.map((pc: any) => pc.propertyId);

    const tenants = await this.prisma.upward_pm_tenant.findMany({
      where: {
        OR: [
          { pmId },
          { pmId: { in: ownerPmIds } },
          { units: { some: { propertyId: { in: collabPropertyIds } } } }
        ]
      },
      include: { 
        units: {
          include: { property: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tenants.map(t => this.mapTenant(t));
  }

  async findById(id: number): Promise<TenantEntity | null> {
    const tenant = await this.prisma.upward_pm_tenant.findUnique({
      where: { id },
      include: { 
        units: {
          include: { property: true }
        }
      }
    });
    if (!tenant) return null;
    return this.mapTenant(tenant);
  }

  async findByUuid(uuid: string): Promise<TenantEntity | null> {
    const tenant = await this.prisma.upward_pm_tenant.findUnique({
      where: { uuid },
      include: { 
        units: {
          include: { property: true }
        }
      }
    });
    if (!tenant) return null;
    return this.mapTenant(tenant);
  }

  async findByUuids(uuids: string[]): Promise<TenantEntity[]> {
    const tenants = await this.prisma.upward_pm_tenant.findMany({
      where: { uuid: { in: uuids } },
      include: { 
        units: {
          include: { property: true }
        }
      }
    });
    return tenants.map(t => this.mapTenant(t));
  }

  async findByEmailHash(pmId: number, emailHash: string): Promise<TenantEntity | null> {
    const tenant = await this.prisma.upward_pm_tenant.findFirst({
      where: { pmId, emailHash },
      include: { 
        units: {
          include: { property: true }
        }
      }
    });
    if (!tenant) return null;
    return this.mapTenant(tenant);
  }

  async findByPhoneHash(pmId: number, phoneHash: string): Promise<TenantEntity | null> {
    const tenant = await this.prisma.upward_pm_tenant.findFirst({
      where: { pmId, phoneHash },
      include: { 
        units: {
          include: { property: true }
        }
      }
    });
    if (!tenant) return null;
    return this.mapTenant(tenant);
  }

  async create(data: Omit<TenantEntity, 'id' | 'uuid'>): Promise<TenantEntity> {
    const firstNameEncrypted = data.firstName ? this.encryption.encrypt(data.firstName) : null;
    const lastNameEncrypted = data.lastName ? this.encryption.encrypt(data.lastName) : null;
    const emailEncrypted = data.email ? this.encryption.encrypt(data.email) : null;
    const phoneEncrypted = data.phone ? this.encryption.encrypt(data.phone) : null;
    const emailHash = data.email ? this.encryption.hash(data.email) : null;
    const phoneHash = data.phone ? this.encryption.hash(data.phone) : null;
    const otherPhoneEncrypted = data.otherPhone ? this.encryption.encrypt(data.otherPhone) : null;
    const otherPhoneHash = data.otherPhone ? this.encryption.hash(data.otherPhone) : null;
    const commercialNameEncrypted = data.commercialName ? this.encryption.encrypt(data.commercialName) : null;

    const tenant = await this.prisma.upward_pm_tenant.create({
      data: {
        pmId: data.pmId,
        firstNameEncrypted,
        firstNameSearch: data.firstName?.toLowerCase(),
        lastNameEncrypted,
        lastNameSearch: data.lastName?.toLowerCase(),
        emailEncrypted,
        emailHash,
        phoneEncrypted,
        phoneHash,
        otherPhoneEncrypted,
        otherPhoneHash,
        commercialNameEncrypted,
        commercialNameSearch: data.commercialName?.toLowerCase(),
        formerAddress: data.formerAddress,
        nextOfKinName: data.nextOfKinName,
        nextOfKinEmail: data.nextOfKinEmail,
        nextOfKinPhone: data.nextOfKinPhone,
        guarantorName: data.guarantorName,
        guarantorEmail: data.guarantorEmail,
        guarantorPhone: data.guarantorPhone,
        emergencyContactName: data.emergencyContactName,
        emergencyContactEmail: data.emergencyContactEmail,
        emergencyContactPhone: data.emergencyContactPhone,
        inviteStatus: data.inviteStatus,
        inviteSentAt: data.inviteSentAt,
        channel: data.channel
      },
      include: { units: { include: { property: true } } }
    });

    return this.mapTenant(tenant);
  }

  async update(uuid: string, data: Partial<Omit<TenantEntity, 'id' | 'uuid' | 'pmId'>>): Promise<TenantEntity> {
    const updateData: any = { ...data };

    if (data.firstName !== undefined) {
      updateData.firstNameEncrypted = data.firstName ? this.encryption.encrypt(data.firstName) : null;
      updateData.firstNameSearch = data.firstName?.toLowerCase();
      delete updateData.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastNameEncrypted = data.lastName ? this.encryption.encrypt(data.lastName) : null;
      updateData.lastNameSearch = data.lastName?.toLowerCase();
      delete updateData.lastName;
    }
    if (data.email !== undefined) {
      updateData.emailEncrypted = data.email ? this.encryption.encrypt(data.email) : null;
      updateData.emailHash = data.email ? this.encryption.hash(data.email) : null;
      delete updateData.email;
    }
    if (data.phone !== undefined) {
      updateData.phoneEncrypted = data.phone ? this.encryption.encrypt(data.phone) : null;
      updateData.phoneHash = data.phone ? this.encryption.hash(data.phone) : null;
      delete updateData.phone;
    }
    if (data.otherPhone !== undefined) {
      updateData.otherPhoneEncrypted = data.otherPhone ? this.encryption.encrypt(data.otherPhone) : null;
      updateData.otherPhoneHash = data.otherPhone ? this.encryption.hash(data.otherPhone) : null;
      delete updateData.otherPhone;
    }
    if (data.commercialName !== undefined) {
      updateData.commercialNameEncrypted = data.commercialName ? this.encryption.encrypt(data.commercialName) : null;
      updateData.commercialNameSearch = data.commercialName?.toLowerCase();
      delete updateData.commercialName;
    }
    if (data.channel !== undefined) {
      updateData.channel = data.channel;
    }

    const tenant = await this.prisma.upward_pm_tenant.update({
      where: { uuid },
      data: updateData,
      include: { units: { include: { property: true } } }
    });

    return this.mapTenant(tenant);
  }
}
