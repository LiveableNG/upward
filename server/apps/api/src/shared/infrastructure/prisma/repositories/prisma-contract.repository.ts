import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { IContractRepository, Contract } from '@domains/contracts/contract.repository'

@Injectable()
export class PrismaContractRepository implements IContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<Contract[]> {
    const contracts = await this.prisma.upward_contract.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    return contracts.map((c) => ({
      ...c,
      propertyName: c.propertyName || undefined,
      leaseEnd: c.leaseEnd || undefined,
    }))
  }

  async save(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
    const saved = await this.prisma.upward_contract.create({
      data: {
        tenantId: contract.tenantId,
        name: contract.name,
        url: contract.url,
        type: contract.type,
        size: contract.size,
        propertyName: contract.propertyName,
        leaseEnd: contract.leaseEnd,
        status: contract.status,
      },
    })

    return {
      ...saved,
      propertyName: saved.propertyName || undefined,
      leaseEnd: saved.leaseEnd || undefined,
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.upward_contract.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })
  }

  async findById(id: string): Promise<Contract | null> {
    const contract = await this.prisma.upward_contract.findUnique({
      where: { id },
    })

    if (!contract) return null

    return {
      ...contract,
      propertyName: contract.propertyName || undefined,
      leaseEnd: contract.leaseEnd || undefined,
    }
  }
}
