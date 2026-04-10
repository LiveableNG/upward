import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class DeleteContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) { }

  async execute(userId: string, uuid: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    const contract = await this.contractRepository.findByUuid(uuid)

    if (!contract) {
      throw new NotFoundException('Document not found')
    }

    if (contract.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this document')
    }

    // 1. Delete from S3
    await this.s3Service.deleteObject(contract.fileUrl)

    // 2. Delete from DB
    await this.contractRepository.delete(uuid)
  }
}
