import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'

@Injectable()
export class DeletePmSignatureUseCase {
  constructor(
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
  ) {}

  async execute(pmId: number, signatureId: number) {
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pmId) {
      throw new NotFoundException('Signature not found')
    }

    await this.signatureRepo.delete(signatureId)
  }
}
