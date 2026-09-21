import { Injectable, Inject } from '@nestjs/common'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'

@Injectable()
export class GetPmSignaturesUseCase {
  constructor(
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
  ) {}

  async execute(pmId: number) {
    const signatures = await this.signatureRepo.findByPmId(pmId)
    return signatures.map((sig) => ({
      ...sig,
      fileUrl: sig.fileKey ? `/api/v1/public/documents/signatures/${sig.uuid}/image` : null,
    }))
  }
}
