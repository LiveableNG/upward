import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import {
  CONTRACT_REPOSITORY,
  IContractRepository,
  Contract,
} from '@domains/contracts/contract.repository'

@Injectable()
export class GetTenantContractsUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly contractRepository: IContractRepository,
  ) {}

  async execute(tenantId: string): Promise<Contract[]> {
    return this.contractRepository.findByTenantId(tenantId)
  }
}

import { S3Service } from '@shared/infrastructure/common/s3/s3.service'

@Injectable()
export class UploadTenantContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly contractRepository: IContractRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(data: {
    tenantId: string
    name: string
    buffer: Buffer
    type: string
    size: number
    propertyName?: string
    leaseEnd?: Date
  }): Promise<Contract> {
    const key = `contracts/${data.tenantId}/${Date.now()}-${data.name}`
    const url = await this.s3Service.uploadBuffer(data.buffer, key, data.type)

    return this.contractRepository.save({
      tenantId: data.tenantId,
      name: data.name,
      url: url,
      type: data.type,
      size: data.size,
      propertyName: data.propertyName,
      leaseEnd: data.leaseEnd,
      status: 'ACTIVE',
    })
  }
}

@Injectable()
export class DeleteTenantContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly contractRepository: IContractRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const contract = await this.contractRepository.findById(id)
    if (!contract || contract.tenantId !== tenantId) {
      throw new NotFoundException('Contract not found')
    }
    await this.contractRepository.delete(id)
  }
}
