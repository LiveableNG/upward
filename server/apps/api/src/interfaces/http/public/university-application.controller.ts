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

function maskPhoneNumber(phone?: string): string {
  if (!phone) return ''
  const clean = phone.trim()
  if (clean.length < 7) return clean
  const prefix = clean.startsWith('+') ? clean.slice(0, 4) : clean.slice(0, 3)
  const suffix = clean.slice(-3)
  return `${prefix} ••••• ${suffix}`
}

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
      const notesLower = notes.toLowerCase()
      const isPaid = obj.feeStatus === 'PAID'
      const isDeposit =
        isPaid &&
        !notesLower.includes('full offer') &&
        !notesLower.includes('full fee') &&
        (notesLower.includes('deposit') ||
          notesLower.includes('down payment') ||
          notesLower.includes('lock-in') ||
          notes.includes('₦25,000'))
      const isFullyCleared = isPaid && notes.includes('FULLY CLEARED')

      const hasNewTrackFullPayment =
        notesLower.includes('full offer') ||
        notesLower.includes('full fee') ||
        notes.includes('FULLY CLEARED')

      // Detect previous 5k registration fee payment under old system (Track 1 / Track 2 or 5,000 fee)
      const isOld5kPaid =
        isPaid &&
        !isDeposit &&
        !isFullyCleared &&
        !hasNewTrackFullPayment &&
        (notes.includes('5,000') ||
          notes.includes('5000') ||
          notesLower.includes('registration fee') ||
          obj.track?.includes('Track 1') ||
          obj.track?.includes('Track 2') ||
          !obj.track)

      const safeWhatsapp = ref ? obj.whatsapp : maskPhoneNumber(obj.whatsapp)

      // Only evaluate paid states if payment was completed and verified
      if (isPaid) {
        // State 1: Paid In Full
        if (isFullyCleared || (!isDeposit && !isOld5kPaid)) {
          return {
            success: true,
            found: true,
            state: 'PAID_FULL',
            data: {
              id: obj.id,
              name: obj.name,
              email: obj.email,
              whatsapp: safeWhatsapp,
              city: obj.city,
              ageBracket: obj.ageBracket,
              occupation: obj.occupation,
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

        // State 2: Deposit Paid (Track A ₦30k down, Track B ₦50k dep, Track C ₦70k dep or ₦25k legacy)
        if (isDeposit && !isFullyCleared) {
          let depositAmount = 70000
          let balanceDue = 80000
          let trackName = obj.track || 'Track C - Practical Experience'

          const isTrackC = trackName.includes('Track C') || notes.includes('Track C') || notes.includes('₦70,000')
          const isTrackB = !isTrackC && (trackName.includes('Track B') || notes.includes('Track B') || notes.includes('₦50,000'))
          const isTrackA = !isTrackC && !isTrackB && (trackName.includes('Track A') || notes.includes('Track A') || notes.includes('₦30,000'))

          if (isTrackA) {
            trackName = 'Track A - Foundation'
            depositAmount = 30000
            balanceDue = 30000
          } else if (isTrackB) {
            trackName = 'Track B - Career Development'
            depositAmount = 50000
            balanceDue = (notes.includes('110,000') || notes.includes('48-Hour') || notes.includes('48h')) ? 60000 : 70000
          } else {
            trackName = 'Track C - Practical Experience'
            if (notes.includes('₦25,000') || notesLower.includes('lock-in')) {
              depositAmount = 25000
              balanceDue = 125000
            } else {
              depositAmount = 70000
              balanceDue = (notes.includes('150,000') || notes.includes('48-Hour') || notes.includes('48h') || !notes.includes('160,000')) ? 80000 : 90000
            }
          }

          return {
            success: true,
            found: true,
            state: 'DEPOSIT_PAID',
            data: {
              id: obj.id,
              name: obj.name,
              email: obj.email,
              whatsapp: safeWhatsapp,
              city: obj.city,
              ageBracket: obj.ageBracket,
              occupation: obj.occupation,
              track: trackName,
              feeStatus: obj.feeStatus,
              paymentRef: obj.paymentRef,
              isDeposit: true,
              depositAmount,
              balanceDue,
              isFullyCleared: false,
              videoUrl: obj.scholarshipVideoUrl,
              notes: obj.notes,
              message: `Welcome back, ${obj.name.split(' ')[0]}! You have an active deposit of ₦${depositAmount.toLocaleString()} paid for ${trackName}. You can clear your remaining ₦${balanceDue.toLocaleString()} balance directly.`,
              switchWarning: '',
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
              whatsapp: safeWhatsapp,
              city: obj.city,
              ageBracket: obj.ageBracket,
              occupation: obj.occupation,
              track: null, // Legacy Track 1 / Track 2 applicants have not chosen a track yet
              feeStatus: obj.feeStatus,
              paymentRef: obj.paymentRef,
              creditAmount: 5000,
              isDeposit: false,
              balanceDue: 0,
              isFullyCleared: false,
              message: `Welcome back, ${obj.name.split(' ')[0]}! We verified your previous ₦5,000 registration fee. Under our updated 3-track structure, you haven't selected a track yet. Choose any track below and your ₦5,000 is automatically credited!`,
            },
          }
        }
      }

      // State 4: Application on file but payment pending
      const isLegacyApplicationTrack = obj.track && (obj.track.includes('Track 1') || obj.track.includes('Track 2'))
      return {
        success: true,
        found: true,
        state: 'APPLICATION_PENDING',
        data: {
          id: obj.id,
          name: obj.name,
          email: obj.email,
          whatsapp: safeWhatsapp,
          city: obj.city,
          ageBracket: obj.ageBracket,
          occupation: obj.occupation,
          track: isLegacyApplicationTrack ? null : obj.track,
          feeStatus: obj.feeStatus,
          notes: obj.notes,
          isDeposit: false,
          balanceDue: 0,
          isFullyCleared: false,
          message: isLegacyApplicationTrack
            ? `Welcome back, ${obj.name.split(' ')[0]}! We have your details on file. Under our updated 3-track structure, please select your track below to proceed to payment.`
            : `Welcome back, ${obj.name.split(' ')[0]}! We have your application on file. Choose your track below to proceed to payment.`,
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
            whatsapp: maskPhoneNumber(eaObj.whatsapp),
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
  async verifyPayment(
    @Query('ref') ref?: string,
    @Query('email') email?: string,
  ) {
    if ((!ref || ref.trim().length === 0) && (!email || email.trim().length === 0)) {
      return { success: false, verified: false, message: 'Reference or email missing' }
    }

    let application: any = null
    if (ref && ref.trim().length > 0) {
      application = await this.applicationRepo.findByPaymentRef(ref.trim())
    }
    if (!application && email && email.trim().length > 0) {
      application = await this.applicationRepo.findByEmail(email.trim().toLowerCase())
    }

    if (!application) {
      return { success: false, verified: false, message: 'Application reference not found' }
    }

    const obj = application.toObject()
    const isPaid = obj.feeStatus === 'PAID'

    const notesLower = (obj.notes || '').toLowerCase()
    const isDeposit =
      !notesLower.includes('full offer') &&
      !notesLower.includes('full fee') &&
      (notesLower.includes('deposit') ||
        notesLower.includes('down payment') ||
        notesLower.includes('lock-in') ||
        notesLower.includes('₦25,000'))
    const isFullyCleared = (obj.notes || '').includes('FULLY CLEARED')

    let depositAmount = 0
    let balanceDue = 0
    let totalPackage = 0

    if (isDeposit && !isFullyCleared) {
      const trackVal = obj.track || ''
      const notesRaw = obj.notes || ''
      const isTrackC = trackVal.includes('Track C') || notesRaw.includes('Track C') || notesRaw.includes('₦70,000')
      const isTrackB = !isTrackC && (trackVal.includes('Track B') || notesRaw.includes('Track B') || notesRaw.includes('₦50,000'))
      const isTrackA = !isTrackC && !isTrackB && (trackVal.includes('Track A') || notesRaw.includes('Track A') || notesRaw.includes('₦30,000'))

      if (isTrackA) {
        depositAmount = 30000
        balanceDue = 30000
        totalPackage = 60000
      } else if (isTrackB) {
        depositAmount = 50000
        const is48h = notesLower.includes('110,000') || notesLower.includes('48-hour') || notesLower.includes('48h')
        balanceDue = is48h ? 60000 : 70000
        totalPackage = depositAmount + balanceDue
      } else {
        if (notesRaw.includes('₦25,000') || notesLower.includes('lock-in')) {
          depositAmount = 25000
          balanceDue = 125000
          totalPackage = 150000
        } else {
          depositAmount = 70000
          const is48h = notesLower.includes('150,000') || notesLower.includes('48-hour') || notesLower.includes('48h') || !notesLower.includes('160,000')
          balanceDue = is48h ? 80000 : 90000
          totalPackage = depositAmount + balanceDue
        }
      }
    }

    return {
      success: isPaid,
      verified: isPaid,
      name: obj.name,
      email: obj.email,
      paymentRef: obj.paymentRef,
      track: obj.track,
      notes: obj.notes,
      videoUrl: obj.scholarshipVideoUrl,
      isDeposit: isDeposit && !isFullyCleared,
      depositAmount,
      balanceDue,
      totalPackage,
      isFullyCleared,
      balanceDueDate: 'December 24, 2026',
    }
  }

  @Post('submit-video')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitVideo(@Body() dto: SubmitUniversityApplicationVideoDto) {
    const result = await this.submitUniversityApplicationVideoUseCase.execute({
      paymentRef: dto.paymentRef,
      email: dto.email,
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
