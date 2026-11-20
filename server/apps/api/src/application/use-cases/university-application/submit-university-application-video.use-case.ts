import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import { UniversityApplication } from '../../../domains/university-application/university-application.entity'

export interface SubmitUniversityApplicationVideoCommand {
  paymentRef: string
  videoUrl: string
}

export interface SubmitUniversityApplicationVideoResult {
  id: string
  paymentRef: string
  videoUrl: string
}

@Injectable()
export class SubmitUniversityApplicationVideoUseCase {
  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
  ) {}

  async execute(
    command: SubmitUniversityApplicationVideoCommand,
  ): Promise<SubmitUniversityApplicationVideoResult> {
    const ref = command.paymentRef.trim()
    const videoUrl = command.videoUrl.trim()

    if (!ref) {
      throw new BadRequestException('Payment reference is required')
    }

    if (!/^https?:\/\/.+/i.test(videoUrl)) {
      throw new BadRequestException('Please provide a valid video link starting with http:// or https://')
    }

    const existing = await this.applicationRepo.findByPaymentRef(ref)
    if (!existing) {
      throw new NotFoundException('Application payment reference not found')
    }

    const existingProps = existing.toObject()
    if (existingProps.feeStatus !== 'PAID') {
      throw new BadRequestException('Payment must be confirmed before submitting an intro video')
    }

    const updated = UniversityApplication.restore({
      ...existingProps,
      scholarshipVideoUrl: videoUrl,
      updatedAt: new Date(),
    })

    const saved = await this.applicationRepo.save(updated)

    return {
      id: saved.id || existingProps.id || '',
      paymentRef: ref,
      videoUrl,
    }
  }
}
