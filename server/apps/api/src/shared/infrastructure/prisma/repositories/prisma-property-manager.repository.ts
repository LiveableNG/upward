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
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
      phoneHash: model.phoneHash,
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
        phone: pm.phone ? this.encryption.encrypt(pm.phone) : null,
        phoneHash: pm.phone ? this.encryption.hash(pm.phone) : null,
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
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }

    const record = await (this.prisma as any).upward_property_manager.update({
      where: { id },
      data: updateData,
    })
    return this.toDomain(record)
  }
}
