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
import { SubmitUniversityApplicationVideoUseCase } from '../../../application/use-cases/university-application/submit-university-application-video.use-case'
import { PayUniversityApplicationBalanceUseCase } from '../../../application/use-cases/university-application/pay-university-application-balance.use-case'
import { CreateUniversityApplicationDto } from '../dto/create-university-application.dto'
import { SubmitUniversityApplicationVideoDto } from '../dto/submit-university-application-video.dto'
import { PayUniversityApplicationBalanceDto } from '../dto/pay-university-application-balance.dto'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'

@Controller('university/application')
export class UniversityApplicationController {
  constructor(
    private readonly submitUniversityApplicationUseCase: SubmitUniversityApplicationUseCase,
    private readonly submitUniversityApplicationVideoUseCase: SubmitUniversityApplicationVideoUseCase,
    private readonly payUniversityApplicationBalanceUseCase: PayUniversityApplicationBalanceUseCase,
    private readonly configService: ConfigService,
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
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

  @Get('lookup')
  async lookupApplicant(
    @Query('email') email?: string,
    @Query('ref') ref?: string,
  ) {
    let application = null

    if (ref && ref.trim().length > 0) {
      application = await this.applicationRepo.findByPaymentRef(ref.trim())
    }

    if (!application && email && email.trim().length > 0) {
      application = await this.applicationRepo.findByEmail(email.trim().toLowerCase())
    }

    if (application) {
      const obj = application.toObject()
      const notes = obj.notes || ''
      const isPaid = obj.feeStatus === 'PAID'
      const isDeposit = notes.includes('Lock-In') || notes.includes('25,000') || notes.includes('deposit')
      const isFullyCleared = notes.includes('FULLY CLEARED')

      // Detect previous 5k registration fee payment under old system (Track 1 / Track 2 or 5,000 fee)
      const isOld5kPaid =
        isPaid &&
        !isDeposit &&
        !isFullyCleared &&
        (obj.applicationFee === 5000 ||
          notes.includes('5,000') ||
          notes.includes('5000') ||
          notes.includes('Registration Fee') ||
          obj.track?.includes('Track 1') ||
          obj.track?.includes('Track 2') ||
          (!notes.includes('100,000') &&
            !notes.includes('60,000') &&
            !notes.includes('160,000') &&
            !notes.includes('200,000') &&
            !notes.includes('135,000')))

      // State 1: Paid In Full
      if (isFullyCleared || (isPaid && !isDeposit && !isOld5kPaid)) {
        return {
          success: true,
          found: true,
          state: 'PAID_FULL',
          data: {
            id: obj.id,
            name: obj.name,
            email: obj.email,
            whatsapp: obj.whatsapp,
            city: obj.city,
            track: obj.track,
            feeStatus: obj.feeStatus,
            paymentRef: obj.paymentRef,
            isDeposit: false,
            balanceDue: 0,
            isFullyCleared: true,
            hasSubmittedVideo: Boolean(obj.scholarshipVideoUrl),
            videoUrl: obj.scholarshipVideoUrl,
            message: `You are already enrolled and fully paid for ${obj.track || 'your chosen track'}! Check your email for cohort onboarding details.`,
          },
        }
      }

      // State 2: 25k Track C Lock-In Deposit Paid
      if (isDeposit && !isFullyCleared) {
        return {
          success: true,
          found: true,
          state: 'DEPOSIT_PAID',
          data: {
            id: obj.id,
            name: obj.name,
            email: obj.email,
            whatsapp: obj.whatsapp,
            city: obj.city,
            ageBracket: obj.ageBracket,
            occupation: obj.occupation,
            track: obj.track || 'Track C - Practical Experience',
            feeStatus: obj.feeStatus,
            paymentRef: obj.paymentRef,
            isDeposit: true,
            depositAmount: 25000,
            balanceDue: 125000,
            isFullyCleared: false,
            videoUrl: obj.scholarshipVideoUrl,
            notes: obj.notes,
            message: `Welcome back, ${obj.name.split(' ')[0]}! You have an active Track C lock-in deposit (₦25,000 paid). You can clear your remaining ₦125,000 balance directly.`,
            switchWarning: `Note: You currently hold a locked-in ₦50,000 discount on Track C (₦150k total instead of ₦200k). If you switch to Track A or Track B, you forfeit the Track C promotional offer and cohort perks.`,
          },
        }
      }

      // State 3: Paid ₦5,000 Registration Fee Under Old System (Credit ₦5k towards any track)
      if (isOld5kPaid) {
        return {
          success: true,
          found: true,
          state: 'PREVIOUS_5K_PAID',
          data: {
            id: obj.id,
            name: obj.name,
            email: obj.email,
            whatsapp: obj.whatsapp,
            city: obj.city,
            ageBracket: obj.ageBracket,
            occupation: obj.occupation,
            track: obj.track,
            feeStatus: obj.feeStatus,
            paymentRef: obj.paymentRef,
            creditAmount: 5000,
            isDeposit: false,
            balanceDue: 0,
            isFullyCleared: false,
            message: `Welcome back, ${obj.name.split(' ')[0]}! We verified your previous ₦5,000 registration fee. Your ₦5,000 is credited toward your tuition below — pick any track to pay your remaining balance with ₦5,000 deducted!`,
          },
        }
      }

      // State 4: Application on file but payment pending
      return {
        success: true,
        found: true,
        state: 'APPLICATION_PENDING',
        data: {
          id: obj.id,
          name: obj.name,
          email: obj.email,
          whatsapp: obj.whatsapp,
          city: obj.city,
          ageBracket: obj.ageBracket,
          occupation: obj.occupation,
          track: obj.track,
          feeStatus: obj.feeStatus,
          isDeposit: false,
          balanceDue: 0,
          isFullyCleared: false,
          message: `Welcome back, ${obj.name.split(' ')[0]}! We have your application on file. We've pre-filled your details — choose your track below to proceed to payment.`,
        },
      }
    }

    // State 5: Check Early Access (webinar / info session registrant not yet on application table)
    if (email && email.trim().length > 0) {
      const ea = await this.earlyAccessRepo.findByEmail(email.trim().toLowerCase())
      if (ea) {
        const eaObj = ea.toObject()
        return {
          success: true,
          found: true,
          state: 'EARLY_ACCESS_WEBINAR',
          data: {
            id: eaObj.id,
            name: eaObj.name,
            email: eaObj.email,
            whatsapp: eaObj.whatsapp,
            city: eaObj.city,
            ageBracket: eaObj.ageBracket,
            interest: eaObj.interest,
            isDeposit: false,
            balanceDue: 0,
            isFullyCleared: false,
            message: `Welcome, ${eaObj.name.split(' ')[0]}! We have your contact details from your webinar/info session registration. We've pre-filled your info — select your preferred track below to complete your admission.`,
          },
        }
      }
    }

    return { success: true, found: false, data: null }
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
      track: obj.track,
      notes: obj.notes,
      videoUrl: obj.scholarshipVideoUrl,
    }
  }

  @Post('submit-video')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitVideo(@Body() dto: SubmitUniversityApplicationVideoDto) {
    const result = await this.submitUniversityApplicationVideoUseCase.execute({
      paymentRef: dto.paymentRef,
      videoUrl: dto.videoUrl,
    })

    return {
      success: true,
      message: 'Intro video submitted successfully',
      data: result,
    }
  }

  @Post('pay-balance')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async payBalance(@Body() dto: PayUniversityApplicationBalanceDto) {
    const result = await this.payUniversityApplicationBalanceUseCase.execute({
      paymentRef: dto.paymentRef,
      email: dto.email,
      balancePaymentRef: dto.balancePaymentRef,
      amountPaid: dto.amountPaid,
    })

    return {
      success: true,
      message: 'Remaining balance cleared successfully',
      data: result,
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
      track: dto.track,
      experienceLevel: dto.experienceLevel,
      goals: dto.goals,
      commitment: dto.commitment,
      why: dto.why,
      timing: dto.timing,
      isScholarship: dto.isScholarship ?? dto.isScholarshipApplicant,
      scholarshipVideoUrl: dto.scholarshipVideoUrl,
      sessionTime: dto.sessionTime,
      sourceIdentifier: dto.sourceIdentifier,
      abVariant: dto.abVariant,
      feeStatus: dto.feeStatus,
      paymentRef: dto.paymentRef,
      paymentPlan: dto.paymentPlan,
      amountPaid: dto.amountPaid,
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
