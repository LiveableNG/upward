import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubmitUniversityReferralsUseCase } from '../../../application/use-cases/university-referral/submit-university-referrals.use-case'
import { SubmitUniversityReferralsDto } from '../dto/submit-university-referrals.dto'

@Controller('university/referrals')
export class UniversityReferralController {
  constructor(
    private readonly submitUniversityReferralsUseCase: SubmitUniversityReferralsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitReferrals(@Body() dto: SubmitUniversityReferralsDto) {
    const result = await this.submitUniversityReferralsUseCase.execute({
      referrerEarlyAccessId: dto.referrerEarlyAccessId,
      referrerName: dto.referrerName,
      referrerPhone: dto.referrerPhone,
      referrerEmail: dto.referrerEmail,
      referrals: dto.referrals,
    })

    return {
      success: true,
      message: 'Referrals processed successfully',
      data: result,
    }
  }
}
