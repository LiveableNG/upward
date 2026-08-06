import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPmReceiptSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { receiptSetting: true },
    })

    if (!pm) return null

    if (!pm.receiptSetting) {
      return {
        logoUrl: null,
        useEmailLogo: true,
        themeColor: '#d97757'
      }
    }

    return pm.receiptSetting
  }
}
