import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SubmitUniversityApplicationUseCase } from '../../../application/use-cases/university-application/submit-university-application.use-case'
import { CreateUniversityApplicationDto } from '../dto/create-university-application.dto'

@Controller('university/application')
export class UniversityApplicationController {
  constructor(
    private readonly submitUniversityApplicationUseCase: SubmitUniversityApplicationUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  async getConfig() {
    const key =
      this.configService.get<string>('PAYSTACK_PUBLIC_KEY') ||
      this.configService.get<string>('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY')
    return {
      success: true,
      paystackPublicKey: key,
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitApplication(@Body() dto: CreateUniversityApplicationDto) {
    const result = await this.submitUniversityApplicationUseCase.execute({
      name: dto.name,
      whatsapp: dto.whatsapp,
      email: dto.email,
      city: dto.city,
      ageBracket: dto.ageBracket,
      occupation: dto.occupation,
      experienceLevel: dto.experienceLevel,
      goals: dto.goals,
      commitment: dto.commitment,
      why: dto.why,
      timing: dto.timing,
      isScholarship: dto.isScholarship ?? dto.isScholarshipApplicant,
      scholarshipVideoUrl: dto.scholarshipVideoUrl,
      feeStatus: dto.feeStatus,
      paymentRef: dto.paymentRef,
      sendEmail: dto.sendEmail,
    })

    return {
      success: true,
      message: result.isAlreadyPaid
        ? 'Application & Fee already confirmed'
        : 'University application received successfully',
      data: result.application.toObject(),
      isAlreadyPaid: result.isAlreadyPaid,
      isExisting: result.isExisting,
    }
  }
}
