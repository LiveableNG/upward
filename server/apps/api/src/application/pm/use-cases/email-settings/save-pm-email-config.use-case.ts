import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

interface SavePmEmailConfigDto {
  senderName?: string
  senderEmail?: string
  logoUrl?: string | null
  footerAddress?: string | null
  cc?: string | null
  bcc?: string | null
  closingStatement?: string | null
  emailSignature?: string | null
  useEmailSignature?: boolean
  defaultFontFamily?: string | null
  defaultFontSize?: string | null
  defaultLineHeight?: string | null
  provider?: string | null
}

@Injectable()
export class SavePmEmailConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, dto: SavePmEmailConfigDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    })

    if (!pm) throw new BadRequestException('Property manager not found')

    const data: any = {
      senderName: dto.senderName || null,
      senderEmail: dto.senderEmail || null,
      logoUrl: dto.logoUrl || null,
      footerAddress: dto.footerAddress || null,
      cc: dto.cc || null,
      bcc: dto.bcc || null,
      closingStatement: dto.closingStatement || null,
      emailSignature: dto.emailSignature || null,
      useEmailSignature: dto.useEmailSignature ?? true,
      defaultFontFamily: dto.defaultFontFamily || null,
      defaultFontSize: dto.defaultFontSize || null,
      defaultLineHeight: dto.defaultLineHeight || null,
    }

    if (dto.provider) {
      data.provider = dto.provider
      if (dto.provider === 'platform-sender') {
        data.isVerified = true
      }
    }

    const settings = await this.prisma.upward_pm_email_setting.upsert({
      where: { pmId: pm.id },
      create: {
        pmId: pm.id,
        ...data,
      },
      update: data,
    })

    return settings
  }
}
