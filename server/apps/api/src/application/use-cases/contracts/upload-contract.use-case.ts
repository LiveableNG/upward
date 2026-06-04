import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { CONTRACT_REPOSITORY, ContractRepository } from '../../../domains/contracts/contract.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
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
    const user = await this.userRepository.findByUuid(dto.userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

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

    const count = await this.contractRepository.countByUserId(user.id!)
    if (count >= this.MAX_CONTRACTS) {
      throw new BadRequestException(`Maximum of ${this.MAX_CONTRACTS} documents allowed per user. Please remove old documents.`)
    }

    if (dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 10MB.`)
    }

    let fileType = dto.fileType
    if (fileType === 'application/octet-stream' || !fileType) {
      const ext = dto.fileName.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') fileType = 'application/pdf'
      else if (ext === 'docx') fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else if (ext === 'doc') fileType = 'application/msword'
      else if (ext === 'png') fileType = 'image/png'
      else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg'
    }

    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    if (!allowedTypes.includes(fileType)) {
      throw new BadRequestException('Only PDF, Image, and Word files are allowed for contracts.')
    }

    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${user.uuid}/contracts/${uuid}.${fileExtension}`

    this.s3Service.uploadBuffer(dto.fileBuffer, s3Key, fileType)
      .catch((err) => console.error(`Background S3 upload failed for ${s3Key}:`, err))

    const contract = await this.contractRepository.save({
      uuid,
      userId: user.id!,
      userPropertyId,
      fileName: dto.fileName,
      fileUrl: s3Key, // Store the S3 key
      fileType: fileType,
      fileSize: dto.fileSize,
    })

    return contract
  }
}
