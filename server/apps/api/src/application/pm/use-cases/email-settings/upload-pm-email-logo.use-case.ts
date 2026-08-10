import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'

@Injectable()
export class UploadPmEmailLogoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async execute(pmUuid: string, base64Data: string, contentType: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    })
    if (!pm) throw new BadRequestException('Property manager not found')

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for logo')
    }

    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = contentType.split('/')[1] || 'png'
    const filename = `logo_${randomUUID()}.${ext}`
    const key = `pm/${pm.uuid}/email-settings/${filename}`

    await this.s3Service.uploadBuffer(buffer, key, contentType)

    const baseUrl =
      this.configService.get<string>('API_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      'http://localhost:4000'

    const publicUrl = `${baseUrl}/api/v1/public/documents/pm/email-settings/logo/${pm.uuid}/${filename}`

    return { publicUrl }
  }
}
