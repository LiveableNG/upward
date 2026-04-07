import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { User, UserRepository } from '@domains/users/user.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): User {
    return {
      id: model.id,
      uuid: model.uuid,
      email: this.encryption.decrypt(model.email),
      emailHash: model.emailHash,
      firstName: this.encryption.decrypt(model.firstName),
      lastName: this.encryption.decrypt(model.lastName),
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
      phoneHash: model.phoneHash,
      passwordHash: model.passwordHash,
      occupation: model.occupation,
      gender: model.gender,
      dateOfBirth: model.dateOfBirth,
      isConvertedFromWaitlist: model.isConvertedFromWaitlist,
      hasDismissedAppBanner: model.hasDismissedAppBanner,
      profilePic: model.profilePic,
      useBiometrics: model.useBiometrics,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailHash = this.encryption.hash(email)
    const record = await this.prisma.upward_user.findUnique({
      where: { emailHash },
    })
    return record ? this.toDomain(record) : null
  }

  async findById(id: number): Promise<User | null> {
    const record = await this.prisma.upward_user.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<User | null> {
    const record = await this.prisma.upward_user.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async save(user: User): Promise<void> {
    await this.prisma.upward_user.create({
      data: {
        uuid: user.uuid,
        email: this.encryption.encrypt(user.email),
        emailHash: this.encryption.hash(user.email),
        firstName: this.encryption.encrypt(user.firstName),
        lastName: this.encryption.encrypt(user.lastName),
        phone: user.phone ? this.encryption.encrypt(user.phone) : null,
        phoneHash: user.phone ? this.encryption.hash(user.phone) : null,
        passwordHash: user.passwordHash,
        occupation: user.occupation,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        isConvertedFromWaitlist: user.isConvertedFromWaitlist,
        hasDismissedAppBanner: user.hasDismissedAppBanner,
        profilePic: user.profilePic,
        useBiometrics: user.useBiometrics,
      },
    })
  }

  async update(id: number, data: Partial<User>): Promise<void> {
    const updateData: any = { ...data }
    
    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    if (data.firstName) {
      updateData.firstName = this.encryption.encrypt(data.firstName)
    }
    if (data.lastName) {
      updateData.lastName = this.encryption.encrypt(data.lastName)
    }
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }

    await this.prisma.upward_user.update({
      where: { id },
      data: updateData,
    })
  }
}
