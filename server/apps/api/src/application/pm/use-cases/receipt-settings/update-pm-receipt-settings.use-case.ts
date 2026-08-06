import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

export interface UpdateReceiptSettingDto {
  logoUrl?: string | null
  useEmailLogo?: boolean
  themeColor?: string
}

@Injectable()
export class UpdatePmReceiptSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, data: UpdateReceiptSettingDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    })

    if (!pm) throw new BadRequestException('PM not found')

    return this.prisma.upward_pm_receipt_setting.upsert({
      where: { pmId: pm.id },
      create: {
        pmId: pm.id,
        logoUrl: data.logoUrl,
        useEmailLogo: data.useEmailLogo ?? true,
        themeColor: data.themeColor ?? '#d97757'
      },
      update: {
        logoUrl: data.logoUrl,
        useEmailLogo: data.useEmailLogo,
        themeColor: data.themeColor,
      }
    })
  }
}
