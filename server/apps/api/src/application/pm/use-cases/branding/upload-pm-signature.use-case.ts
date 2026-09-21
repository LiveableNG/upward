import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

export interface UploadPmSignatureDto {
  pmId: number
  base64Data: string
  contentType: string
}

@Injectable()
export class UploadPmSignatureUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: UploadPmSignatureDto) {
    const { pmId, base64Data, contentType } = dto

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for signatures')
    }

    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId },
      select: { uuid: true },
    })
    if (!pm) {
      throw new NotFoundException('Property manager not found')
    }

    const ext = contentType.split('/')[1] || 'png'
    const key = `pm/${pm.uuid}/signatures/sig_${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, contentType)

    return { fileKey: key, publicUrl }
  }
}
