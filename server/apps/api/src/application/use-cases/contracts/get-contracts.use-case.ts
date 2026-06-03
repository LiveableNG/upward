import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class GetContractsUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    const contracts = await this.contractRepository.findByUserId(user.id!)

    // Generate signed URLs for each contract
    const contractsWithUrls = await Promise.all(
      contracts.map(async (c) => {
        const url = await this.s3Service.getDownloadUrl(c.fileUrl)
        return {
          ...c,
          fileUrl: url,
          source: (c as any).source || 'TENANT',
        }
      }),
    )

    return contractsWithUrls
  }
}
