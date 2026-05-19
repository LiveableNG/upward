import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { PropertyManager, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaPropertyManagerRepository implements PropertyManagerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): PropertyManager {
    return {
      id: model.id,
      uuid: model.uuid,
      email: this.encryption.decrypt(model.email),
      emailHash: model.emailHash,
      passwordHash: model.passwordHash,
      firstName: this.encryption.decrypt(model.firstName),
      firstNameHash: model.firstNameHash,
      lastName: this.encryption.decrypt(model.lastName),
      lastNameHash: model.lastNameHash,
      businessName: model.businessName ? this.encryption.decrypt(model.businessName) : undefined,
      pmType: model.pmType,
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
      phoneHash: model.phoneHash,
      profilePic: model.profilePic,
      country: model.country,
      cacNumber: model.cacNumber,
      bankName: model.bankName,
      bankCode: model.bankCode,
      accountNumber: model.accountNumber ? this.encryption.decrypt(model.accountNumber) : undefined,
      accountName: model.accountName ? this.encryption.decrypt(model.accountName) : undefined,
      letterheadHeaderUrl: model.letterheadHeaderUrl,
      letterheadFooterUrl: model.letterheadFooterUrl,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findByEmail(email: string): Promise<PropertyManager | null> {
    const emailHash = this.encryption.hash(email)
    const record = await (this.prisma as any).upward_property_manager.findUnique({
      where: { emailHash },
    })
    return record ? this.toDomain(record) : null
  }

  async findByPhone(phone: string): Promise<PropertyManager | null> {
    const phoneHash = this.encryption.hash(phone)
    const record = await (this.prisma as any).upward_property_manager.findFirst({
      where: { phoneHash },
    })
    return record ? this.toDomain(record) : null
  }

  async findById(id: number): Promise<PropertyManager | null> {
    const record = await (this.prisma as any).upward_property_manager.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<PropertyManager | null> {
    const record = await (this.prisma as any).upward_property_manager.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async save(pm: PropertyManager): Promise<PropertyManager> {
    if (pm.id) {
      return this.update(pm.id, pm)
    }

    const record = await (this.prisma as any).upward_property_manager.create({
      data: {
        uuid: pm.uuid,
        email: this.encryption.encrypt(pm.email),
        emailHash: this.encryption.hash(pm.email),
        passwordHash: pm.passwordHash,
        firstName: this.encryption.encrypt(pm.firstName),
        firstNameHash: pm.firstNameHash ?? this.encryption.hash(pm.firstName),
        lastName: this.encryption.encrypt(pm.lastName),
        lastNameHash: pm.lastNameHash ?? this.encryption.hash(pm.lastName),
        businessName: pm.businessName ? this.encryption.encrypt(pm.businessName) : null,
        pmType: pm.pmType,
        phone: pm.phone ? this.encryption.encrypt(pm.phone) : null,
        phoneHash: pm.phone ? this.encryption.hash(pm.phone) : null,
        profilePic: pm.profilePic,
        country: pm.country,
        cacNumber: pm.cacNumber,
        bankName: pm.bankName,
        bankCode: pm.bankCode,
        accountNumber: pm.accountNumber ? this.encryption.encrypt(pm.accountNumber) : null,
        accountName: pm.accountName ? this.encryption.encrypt(pm.accountName) : null,
      },
    })
    return this.toDomain(record)
  }


  async update(id: number, data: Partial<PropertyManager>): Promise<PropertyManager> {
    const updateData: any = {}
    
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash

    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    if (data.firstName) {
      updateData.firstName = this.encryption.encrypt(data.firstName)
      updateData.firstNameHash = this.encryption.hash(data.firstName)
    }
    if (data.lastName) {
      updateData.lastName = this.encryption.encrypt(data.lastName)
      updateData.lastNameHash = this.encryption.hash(data.lastName)
    }
    if (data.businessName) {
      updateData.businessName = this.encryption.encrypt(data.businessName)
    }
    if (data.pmType !== undefined) {
      updateData.pmType = data.pmType
    }
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }
    if (data.profilePic !== undefined) updateData.profilePic = data.profilePic
    if (data.country !== undefined) updateData.country = data.country
    if (data.cacNumber !== undefined) updateData.cacNumber = data.cacNumber
    if (data.bankName !== undefined) updateData.bankName = data.bankName
    if (data.bankCode !== undefined) updateData.bankCode = data.bankCode
    if (data.accountNumber !== undefined) {
      updateData.accountNumber = data.accountNumber ? this.encryption.encrypt(data.accountNumber) : null
    }
    if (data.accountName !== undefined) {
      updateData.accountName = data.accountName ? this.encryption.encrypt(data.accountName) : null
    }
    if (data.letterheadHeaderUrl !== undefined) {
      updateData.letterheadHeaderUrl = data.letterheadHeaderUrl
    }
    if (data.letterheadFooterUrl !== undefined) {
      updateData.letterheadFooterUrl = data.letterheadFooterUrl
    }

    const record = await (this.prisma as any).upward_property_manager.update({
      where: { id },
      data: updateData,
    })
    return this.toDomain(record)
  }
}
