import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { LandlordEntity, ILandlordRepository } from '../../../../domains/pm/ILandlordRepository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaLandlordRepository implements ILandlordRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): LandlordEntity {
    return {
      id: model.id,
      uuid: model.uuid,
      email: this.encryption.decrypt(model.email),
      emailHash: model.emailHash,
      passwordHash: model.passwordHash,
      firstName: model.firstName ? this.encryption.decrypt(model.firstName) : null,
      lastName: model.lastName ? this.encryption.decrypt(model.lastName) : null,
      phone: model.phone ? this.encryption.decrypt(model.phone) : null,
      mustChangePassword: model.mustChangePassword,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findByEmail(email: string): Promise<LandlordEntity | null> {
    const emailHash = this.encryption.hash(email)
    const record = await (this.prisma as any).upward_pm_landlord.findUnique({
      where: { emailHash },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<LandlordEntity | null> {
    const record = await (this.prisma as any).upward_pm_landlord.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async create(data: LandlordEntity): Promise<LandlordEntity> {
    const record = await (this.prisma as any).upward_pm_landlord.create({
      data: {
        uuid: data.uuid,
        email: this.encryption.encrypt(data.email),
        emailHash: data.emailHash,
        passwordHash: data.passwordHash,
        firstName: data.firstName ? this.encryption.encrypt(data.firstName) : null,
        lastName: data.lastName ? this.encryption.encrypt(data.lastName) : null,
        phone: data.phone ? this.encryption.encrypt(data.phone) : null,
        phoneHash: data.phone ? this.encryption.hash(data.phone) : null,
        mustChangePassword: data.mustChangePassword,
      },
    })
    return this.toDomain(record)
  }

  async update(uuid: string, data: Partial<LandlordEntity>): Promise<LandlordEntity> {
    const record = await (this.prisma as any).upward_pm_landlord.update({
      where: { uuid },
      data: {
        passwordHash: data.passwordHash,
        firstName: data.firstName ? this.encryption.encrypt(data.firstName) : undefined,
        lastName: data.lastName ? this.encryption.encrypt(data.lastName) : undefined,
        phone: data.phone ? this.encryption.encrypt(data.phone) : undefined,
        phoneHash: data.phone ? this.encryption.hash(data.phone) : undefined,
        mustChangePassword: data.mustChangePassword,
      },
    })
    return this.toDomain(record)
  }

  async save(landlord: LandlordEntity): Promise<LandlordEntity> {
      if (landlord.id) {
          const { id, ...rest } = landlord;
          return this.update(landlord.uuid, rest);
      }
      return this.create(landlord);
  }
}
