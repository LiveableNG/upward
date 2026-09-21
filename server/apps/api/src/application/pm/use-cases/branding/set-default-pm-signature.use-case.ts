import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'

@Injectable()
export class SetDefaultPmSignatureUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
  ) {}

  async execute(pmId: number, signatureId: number) {
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pmId) {
      throw new NotFoundException('Signature not found')
    }

    await (this.prisma as any).upward_pm_signature.updateMany({
      where: { pmId },
      data: { isDefault: false },
    })

    return this.signatureRepo.update(signatureId, { isDefault: true })
  }
}
