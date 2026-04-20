import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { KYCReportPdfService } from '../../../shared/infrastructure/common/kyc/kyc-report-pdf.service'
import { CalculateRentScoreUseCase } from './calculate-rent-score.use-case'

@Injectable()
export class GenerateKYCReportPdfUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly pdfService: KYCReportPdfService,
    private readonly calculateScore: CalculateRentScoreUseCase,
  ) {}

  async execute(userId: string): Promise<Buffer> {
    const scoreData = await this.calculateScore.execute(userId)
    
    if (!scoreData.success || !scoreData.data) {
      throw new NotFoundException('Could not generate score data for report')
    }

    const data = scoreData.data

    return this.pdfService.generateReportPdf({
      profile: {
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone,
        bio: data.profile.bio,
        rank: data.rank,
        band: data.band,
      },
      score: data.score,
      metrics: data.metrics,
      properties: data.properties,
      cycles: data.cycles,
    })
  }
}
