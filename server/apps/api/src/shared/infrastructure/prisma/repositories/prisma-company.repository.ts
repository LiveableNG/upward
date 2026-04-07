import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Company,
  CompanyUser,
  Manager,
  CompanyRepository,
  CompanyUserRepository,
  ManagerRepository,
} from '@domains/companies/company.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Company | null> {
    const record = await this.prisma.upward_company.findUnique({
      where: { id },
    })
    return record as unknown as Company | null
  }

  async findByUuid(uuid: string): Promise<Company | null> {
    const record = await this.prisma.upward_company.findUnique({
      where: { uuid },
    })
    return record as unknown as Company | null
  }

  async findByApiKey(apiKey: string): Promise<Company | null> {
    const record = await this.prisma.upward_company.findFirst({
      where: { apiKey },
    })
    return record as unknown as Company | null
  }

  async save(company: Company): Promise<void> {
    const data = {
      name: company.name,
      address: company.address,
      webhookUrl: company.webhookUrl,
      apiKey: company.apiKey,
    }
    if (company.id === 0) {
      await this.prisma.upward_company.create({ data })
    } else {
      await this.prisma.upward_company.update({
        where: { id: company.id },
        data,
      })
    }
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
      lastName: this.encryption.decrypt(model.lastName),
      phone: model.phone ? this.encryption.decrypt(model.phone) : undefined,
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
    const data = {
      companyId: manager.companyId,
      firstName: this.encryption.encrypt(manager.firstName),
      lastName: this.encryption.encrypt(manager.lastName),
      phone: manager.phone ? this.encryption.encrypt(manager.phone) : null,
      email: this.encryption.encrypt(manager.email),
      emailHash: this.encryption.hash(manager.email),
    }
    if (manager.id === 0) {
      await this.prisma.upward_manager.create({ data })
    } else {
      await this.prisma.upward_manager.update({
        where: { id: manager.id },
        data,
      })
    }
  }
}
