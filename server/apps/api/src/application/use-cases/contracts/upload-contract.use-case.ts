import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import * as crypto from 'crypto'

export interface UploadContractDto {
  userId: string
  propertyUuid?: string
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
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    private readonly s3Service: S3Service,
  ) { }

  async execute(dto: UploadContractDto) {
    // 1. Validate User
    const user = await this.userRepository.findByUuid(dto.userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    // 2. Resolve property ID if propertyUuid is supplied
    let userPropertyId = dto.userPropertyId
    if (dto.propertyUuid) {
      const property = await this.propertyRepository.findByUuid(dto.propertyUuid)
      if (!property) {
        throw new BadRequestException('Property not found')
      }
      if (property.userId !== user.id) {
        throw new BadRequestException('Property does not belong to user')
      }
      userPropertyId = property.id
    }

    // 3. Anti-abuse: Check max contracts
    const count = await this.contractRepository.countByUserId(user.id!)
    if (count >= this.MAX_CONTRACTS) {
      throw new BadRequestException(`Maximum of ${this.MAX_CONTRACTS} documents allowed per user. Please remove old documents.`)
    }

    // 4. Anti-abuse: Check file size
    if (dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 10MB.`)
    }

    // 5. Validate file type (optional but recommended)
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

    // 6. Upload to S3
    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${user.uuid}/contracts/${uuid}.${fileExtension}`
    
    await this.s3Service.uploadBuffer(dto.fileBuffer, s3Key, dto.fileType)

    // 7. Save to DB
    const contract = await this.contractRepository.save({
      uuid,
      userId: user.id!,
      userPropertyId,
      fileName: dto.fileName,
      fileUrl: s3Key, // Store the key
      fileType: dto.fileType,
      fileSize: dto.fileSize,
    })

    return contract
  }
}
