import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPmEmailSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })

    if (!pm) throw new BadRequestException('Property manager not found')

    return pm.emailSetting || null
  }
}
