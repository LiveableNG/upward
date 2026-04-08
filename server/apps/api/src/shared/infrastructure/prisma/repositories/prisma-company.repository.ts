import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Company,
  CompanyUser,
  Manager,
  Platform,
  CompanyRepository,
  CompanyUserRepository,
  ManagerRepository,
  PlatformRepository,
} from '@domains/companies/company.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private toDomain(model: any): Company {
    return {
      id: model.id,
      uuid: model.uuid,
      name: this.encryption.decrypt(model.name),
      nameHash: model.nameHash,
      address: model.address,
      email: model.email ? this.encryption.decrypt(model.email) : null,
      emailHash: model.emailHash,
      phone: model.phone ? this.encryption.decrypt(model.phone) : null,
      phoneHash: model.phoneHash,
      platformId: model.platformId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findById(id: number): Promise<Company | null> {
    const record = await this.prisma.upward_company.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<Company | null> {
    const record = await this.prisma.upward_company.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async findByName(name: string): Promise<Company | null> {
    const nameHash = this.encryption.hash(name)
    const record = await this.prisma.upward_company.findFirst({
      where: { nameHash },
    })
    return record ? this.toDomain(record) : null
  }

  async save(company: Company): Promise<void> {
    const data: any = {
      uuid: company.uuid || crypto.randomUUID(),
      name: this.encryption.encrypt(company.name),
      nameHash: this.encryption.hash(company.name),
      address: company.address,
      email: company.email ? this.encryption.encrypt(company.email) : null,
      emailHash: company.email ? this.encryption.hash(company.email) : null,
      phone: company.phone ? this.encryption.encrypt(company.phone) : null,
      phoneHash: company.phone ? this.encryption.hash(company.phone) : null,
      platform: company.platformId ? { connect: { id: company.platformId } } : undefined,
    }
    await this.prisma.upward_company.create({ data })
  }

  async update(id: number, data: Partial<Company>): Promise<void> {
    const updateData: any = { ...data }
    if (data.name) {
      updateData.name = this.encryption.encrypt(data.name)
      updateData.nameHash = this.encryption.hash(data.name)
    }
    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }
    await this.prisma.upward_company.update({
      where: { id },
      data: updateData,
    })
  }
}

@Injectable()
export class PrismaPlatformRepository implements PlatformRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private toDomain(model: any): Platform {
    return {
      id: model.id,
      uuid: model.uuid,
      apiKey: model.apiKey,
      webhookUrl: model.webhookUrl,
      name: this.encryption.decrypt(model.name),
      nameHash: model.nameHash,
      address: model.address,
      email: model.email ? this.encryption.decrypt(model.email) : null,
      emailHash: model.emailHash,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findById(id: number): Promise<Platform | null> {
    const record = await this.prisma.upward_platform.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByApiKey(apiKey: string): Promise<Platform | null> {
    const record = await this.prisma.upward_platform.findUnique({
      where: { apiKey },
    })
    return record ? this.toDomain(record) : null
  }

  async findByEmail(email: string): Promise<Platform | null> {
    const emailHash = this.encryption.hash(email)
    const record = await this.prisma.upward_platform.findUnique({
      where: { emailHash },
    })
    return record ? this.toDomain(record) : null
  }

  async save(platform: Platform): Promise<void> {
    await this.prisma.upward_platform.create({
      data: {
        apiKey: platform.apiKey,
        webhookUrl: platform.webhookUrl,
        name: this.encryption.encrypt(platform.name),
        nameHash: this.encryption.hash(platform.name),
        address: platform.address,
        email: platform.email ? this.encryption.encrypt(platform.email) : null,
        emailHash: platform.email ? this.encryption.hash(platform.email) : null,
      },
    })
  }

  async update(id: number, data: Partial<Platform>): Promise<void> {
    const updateData: any = { ...data }
    if (data.name) {
      updateData.name = this.encryption.encrypt(data.name)
      updateData.nameHash = this.encryption.hash(data.name)
    }
    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    await this.prisma.upward_platform.update({
      where: { id },
      data: updateData,
    })
  }
}

@Injectable()
export class PrismaCompanyUserRepository implements CompanyUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompanyAndUser(companyId: number, userId: number): Promise<CompanyUser | null> {
    const record = await this.prisma.upward_company_user.findUnique({
      where: {
        companyId_userId: { companyId, userId },
      },
    })
    return record as unknown as CompanyUser | null
  }

  async save(companyUser: CompanyUser): Promise<void> {
    await this.prisma.upward_company_user.create({
      data: {
        companyId: companyUser.companyId,
        userId: companyUser.userId,
        invitedAt: companyUser.invitedAt,
        acceptedAt: companyUser.acceptedAt,
      },
    })
  }

  async update(id: number, data: Partial<CompanyUser>): Promise<void> {
    await this.prisma.upward_company_user.update({
      where: { id },
      data,
    })
  }
}

@Injectable()
export class PrismaManagerRepository implements ManagerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private toDomain(model: any): Manager {
    return {
      id: model.id,
      uuid: model.uuid,
      companyId: model.companyId,
      firstName: this.encryption.decrypt(model.firstName),
      firstNameHash: model.firstNameHash,
      lastName: this.encryption.decrypt(model.lastName),
      lastNameHash: model.lastNameHash,
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
      phoneHash: model.phoneHash,
      email: this.encryption.decrypt(model.email),
      emailHash: model.emailHash,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findById(id: number): Promise<Manager | null> {
    const record = await this.prisma.upward_manager.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<Manager | null> {
    const record = await this.prisma.upward_manager.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async findByEmail(email: string): Promise<Manager | null> {
    const emailHash = this.encryption.hash(email)
    const record = await this.prisma.upward_manager.findUnique({
      where: { emailHash },
    })
    return record ? this.toDomain(record) : null
  }

  async save(manager: Manager): Promise<void> {
    const data: any = {
      uuid: manager.uuid || crypto.randomUUID(),
      company: { connect: { id: manager.companyId } },
      firstName: manager.firstName ? this.encryption.encrypt(manager.firstName) : null,
      firstNameHash: manager.firstName ? this.encryption.hash(manager.firstName) : null,
      lastName: manager.lastName ? this.encryption.encrypt(manager.lastName) : null,
      lastNameHash: manager.lastName ? this.encryption.hash(manager.lastName) : null,
      phone: manager.phone ? this.encryption.encrypt(manager.phone) : null,
      phoneHash: manager.phone ? this.encryption.hash(manager.phone) : null,
      email: manager.email ? this.encryption.encrypt(manager.email) : null,
      emailHash: manager.email ? this.encryption.hash(manager.email) : null,
    }
    await this.prisma.upward_manager.create({ data })
  }

  async update(id: number, data: Partial<Manager>): Promise<void> {
    const updateData: any = { ...data }
    if (data.firstName) {
      updateData.firstName = this.encryption.encrypt(data.firstName)
      updateData.firstNameHash = this.encryption.hash(data.firstName)
    }
    if (data.lastName) {
      updateData.lastName = this.encryption.encrypt(data.lastName)
      updateData.lastNameHash = this.encryption.hash(data.lastName)
    }
    if (data.phone) {
      updateData.phone = this.encryption.encrypt(data.phone)
      updateData.phoneHash = this.encryption.hash(data.phone)
    }
    if (data.email) {
      updateData.email = this.encryption.encrypt(data.email)
      updateData.emailHash = this.encryption.hash(data.email)
    }
    await this.prisma.upward_manager.update({
      where: { id: id },
      data: updateData,
    })
  }
}
