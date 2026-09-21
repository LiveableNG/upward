import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPmVerificationStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    const verification = await this.prisma.upward_pm_verification.findUnique({
      where: { pmId },
    })
    return verification || { status: 'NOT_SUBMITTED' }
  }
}
