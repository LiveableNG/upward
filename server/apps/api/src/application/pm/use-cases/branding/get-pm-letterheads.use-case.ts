import { Injectable, Inject } from '@nestjs/common'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'

@Injectable()
export class GetPmLetterheadsUseCase {
  constructor(
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number) {
    const letterheads = await this.letterheadRepo.findByPmId(pmId)
    return Promise.all(
      letterheads.map(async (lh) => ({
        ...lh,
        previewFirstPageUrl: lh.previewFirstPageKey ? await this.s3Service.getDownloadUrl(lh.previewFirstPageKey) : null,
        previewContinuationPageUrl: lh.previewContinuationPageKey ? await this.s3Service.getDownloadUrl(lh.previewContinuationPageKey) : null,
        templateFileUrl: lh.templateFileKey ? await this.s3Service.getDownloadUrl(lh.templateFileKey) : null,
      }))
    )
  }
}
