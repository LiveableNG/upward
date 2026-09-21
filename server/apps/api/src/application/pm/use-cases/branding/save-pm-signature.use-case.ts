import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'
import { randomUUID } from 'crypto'

export interface SavePmSignatureDto {
  pmId: number
  name?: string
  type: string
  fileKey?: string
  content?: string
  isDefault?: boolean
}

@Injectable()
export class SavePmSignatureUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
  ) {}

  async execute(dto: SavePmSignatureDto) {
    const isDefault = dto.isDefault === true

    if (isDefault) {
      await (this.prisma as any).upward_pm_signature.updateMany({
        where: { pmId: dto.pmId },
        data: { isDefault: false },
      })
    }

    return this.signatureRepo.save({
      uuid: randomUUID(),
      pmId: dto.pmId,
      name: dto.name || 'Unnamed Signature',
      type: dto.type,
      fileKey: dto.fileKey || null,
      content: dto.content || null,
      isDefault,
    })
  }
}
