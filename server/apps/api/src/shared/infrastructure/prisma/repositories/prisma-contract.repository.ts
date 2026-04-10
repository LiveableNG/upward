import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { Contract, ContractRepository } from '../../../../domains/contracts/contract.repository'

@Injectable()
export class PrismaContractRepository implements ContractRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(contract: Contract): Promise<Contract> {
    const data = {
      uuid: contract.uuid,
      userId: contract.userId,
      userPropertyId: contract.userPropertyId,
      fileName: contract.fileName,
      fileUrl: contract.fileUrl,
      fileType: contract.fileType,
      fileSize: contract.fileSize,
    }

    if (contract.id) {
      return this.prisma.upward_user_contract.update({
        where: { id: contract.id },
        data,
      })
    }

    return this.prisma.upward_user_contract.create({
      data,
    })
  }

  async findById(id: number): Promise<Contract | null> {
    return this.prisma.upward_user_contract.findUnique({
      where: { id },
    })
  }

  async findByUuid(uuid: string): Promise<Contract | null> {
    return this.prisma.upward_user_contract.findUnique({
      where: { uuid },
    })
  }

  async findByUserId(userId: number): Promise<Contract[]> {
    return this.prisma.upward_user_contract.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async delete(uuid: string): Promise<void> {
    await this.prisma.upward_user_contract.delete({
      where: { uuid },
    })
  }

  async countByUserId(userId: number): Promise<number> {
    return this.prisma.upward_user_contract.count({
      where: { userId },
    })
  }
}
