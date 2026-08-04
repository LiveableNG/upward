import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmDvaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    const dva = await this.prisma.upward_pm_dedicated_virtual_account.findUnique({
      where: { pmId: pm.id },
    });

    return dva;
  }
}
