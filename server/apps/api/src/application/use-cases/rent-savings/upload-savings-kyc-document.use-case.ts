import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export type SavingsKycDocumentKind = 'id_card' | 'utility_bill'

const ALLOWED_KYC_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_KYC_DOC_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface UploadSavingsKycDocumentInput {
  userId: number
  kind: SavingsKycDocumentKind
  fileBuffer: Buffer
  fileName: string
  mimeType: string
}

@Injectable()
export class UploadSavingsKycDocumentUseCase {
  private readonly logger = new Logger(UploadSavingsKycDocumentUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Optional() private readonly s3Service?: S3Service,
  ) {}

  async execute(input: UploadSavingsKycDocumentInput) {
    if (input.kind !== 'id_card' && input.kind !== 'utility_bill') {
      throw new BadRequestException('Document kind must be "id_card" or "utility_bill".')
    }

    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      throw new BadRequestException('Uploaded document file is empty.')
    }

    if (input.fileBuffer.length > MAX_KYC_DOC_SIZE_BYTES) {
      throw new BadRequestException('Document size must not exceed 5MB.')
    }

    const normalizedMime = (input.mimeType || '').toLowerCase().trim()
    if (!ALLOWED_KYC_MIMES.has(normalizedMime)) {
      throw new BadRequestException(
        'Only JPG, PNG, WEBP, and PDF documents are supported for ARM KYC verification.',
      )
    }

    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const ext =
      normalizedMime === 'application/pdf'
        ? 'pdf'
        : normalizedMime === 'image/png'
          ? 'png'
          : normalizedMime === 'image/webp'
            ? 'webp'
            : 'jpg'

    const fileId = crypto.randomUUID()
    const safeFileName = (input.fileName || `${input.kind}.${ext}`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100)
    const s3Key = `users/${user.uuid}/arm-kyc/${input.kind}/${fileId}.${ext}`

    const hasAwsCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    const isProd = isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)

    let storedKey = s3Key

    if (this.s3Service && hasAwsCreds) {
      try {
        await this.s3Service.uploadBuffer(input.fileBuffer, s3Key, normalizedMime)
      } catch (err: any) {
        if (isProd) {
          throw err
        }
        this.logger.warn(
          `S3 upload failed in non-production (${err?.message}); falling back to local .uploads storage.`,
        )
        storedKey = await this.writeLocalFallback(user.uuid, input.kind, `${fileId}.${ext}`, input.fileBuffer)
      }
    } else if (!isProd) {
      storedKey = await this.writeLocalFallback(user.uuid, input.kind, `${fileId}.${ext}`, input.fileBuffer)
    } else {
      throw new BadRequestException('Document storage service is not configured.')
    }

    return {
      status: 'success',
      data: {
        doc_key: storedKey,
        file_name: safeFileName,
        mime_type: normalizedMime,
        size_bytes: input.fileBuffer.length,
        kind: input.kind,
      },
    }
  }

  private async writeLocalFallback(
    userUuid: string,
    kind: SavingsKycDocumentKind,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const relPath = path.posix.join('arm-kyc', userUuid, kind, fileName)
    const absPath = path.resolve(process.cwd(), '.uploads', relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, buffer)
    return `local:${relPath}`
  }
}
