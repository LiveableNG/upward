import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import * as crypto from 'crypto'

export interface GetContractUploadUrlDto {
  userId: string
  fileName: string
  fileType: string
  fileSize?: number
}

@Injectable()
export class GetContractUploadUrlUseCase {
  private readonly MAX_CONTRACTS = 10
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) { }

  async execute(dto: GetContractUploadUrlDto) {
    // 1. Validate User
    const user = await this.userRepository.findByUuid(dto.userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    // 2. Anti-abuse: Check max contracts
    const count = await this.contractRepository.countByUserId(user.id!)
    if (count >= this.MAX_CONTRACTS) {
      throw new BadRequestException(`Maximum of ${this.MAX_CONTRACTS} documents allowed per user. Please remove old documents.`)
    }

    // 3. Anti-abuse: Check file size (if provided)
    if (dto.fileSize && dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 10MB.`)
    }

    // 4. Validate file type
    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    if (!allowedTypes.includes(dto.fileType)) {
      throw new BadRequestException('Only PDF, Image, and Word files are allowed for contracts.')
    }

    // 5. Generate S3 path
    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${user.uuid}/contracts/${uuid}.${fileExtension}`

    // 6. Request pre-signed S3 URL
    const uploadUrl = await this.s3Service.getUploadUrl(s3Key, dto.fileType)

    return {
      uuid,
      uploadUrl,
      fileUrl: s3Key, // Store the key
    }
  }
}
