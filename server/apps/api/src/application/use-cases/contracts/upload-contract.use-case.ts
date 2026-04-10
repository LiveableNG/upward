import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import * as crypto from 'crypto'

export interface UploadContractDto {
  userId: string
  userPropertyId?: number
  fileName: string
  fileBuffer: Buffer
  fileType: string
  fileSize: number
}

@Injectable()
export class UploadContractUseCase {
  private readonly MAX_CONTRACTS = 10
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) { }

  async execute(dto: UploadContractDto) {
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

    // 3. Anti-abuse: Check file size
    if (dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 10MB.`)
    }

    // 4. Validate file type (optional but recommended)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(dto.fileType)) {
      throw new BadRequestException('Only PDF and Image files are allowed for contracts.')
    }

    // 5. Upload to S3
    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${user.uuid}/contracts/${uuid}.${fileExtension}`
    
    await this.s3Service.uploadBuffer(dto.fileBuffer, s3Key, dto.fileType)

    // 6. Save to DB
    const contract = await this.contractRepository.save({
      uuid,
      userId: user.id!,
      userPropertyId: dto.userPropertyId,
      fileName: dto.fileName,
      fileUrl: s3Key, // Store the key
      fileType: dto.fileType,
      fileSize: dto.fileSize,
    })

    return contract
  }
}
