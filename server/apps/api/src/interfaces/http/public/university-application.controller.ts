import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SubmitUniversityApplicationUseCase } from '../../../application/use-cases/university-application/submit-university-application.use-case'
import { CreateUniversityApplicationDto } from '../dto/create-university-application.dto'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'

@Controller('university/application')
export class UniversityApplicationController {
  constructor(
    private readonly submitUniversityApplicationUseCase: SubmitUniversityApplicationUseCase,
    private readonly configService: ConfigService,
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
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

  @Get('verify-payment')
  async verifyPayment(@Query('ref') ref?: string) {
    if (!ref || ref.trim().length === 0) {
      return { success: false, verified: false, message: 'Reference missing' }
    }

    const application = await this.applicationRepo.findByPaymentRef(ref.trim())
    if (!application) {
      return { success: false, verified: false, message: 'Application reference not found' }
    }

    const obj = application.toObject()
    const isPaid = obj.feeStatus === 'PAID'

    return {
      success: isPaid,
      verified: isPaid,
      name: obj.name,
      paymentRef: obj.paymentRef,
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
