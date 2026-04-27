import { Injectable, Inject } from '@nestjs/common'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '../../../domains/waitlist/waitlist.repository'
import { WaitlistEntry } from '../../../domains/waitlist/waitlist.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'

export interface JoinWaitlistDto {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: string
  benefits?: string[]
  acceptTerms?: boolean
  wantsAmbassador?: boolean
  country?: string
  city?: string
  selectedSession?: string
  abVariant?: string
}

@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepo: WaitlistRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: JoinWaitlistDto) {
    if (dto.phone && !/^\+234\d{10}$/.test(dto.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }
    let entry = await this.waitlistRepo.findByEmail(dto.email)
    const alreadyExists = !!entry

    if (!entry) {
      entry = WaitlistEntry.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        benefits: dto.benefits || [],
        acceptTerms: dto.acceptTerms || false,
        wantsAmbassador: dto.wantsAmbassador || false,
        country: dto.country,
        city: dto.city,
        selectedSession: dto.selectedSession,
        abVariant: dto.abVariant,
      })
    } else {
      entry.updateProfile({
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        benefits: dto.benefits,
        acceptTerms: dto.acceptTerms,
        wantsAmbassador: dto.wantsAmbassador,
        country: dto.country,
        city: dto.city,
        selectedSession: dto.selectedSession,
        abVariant: dto.abVariant,
      })
    }

    // Process Confirmation Email Logic
    const sendConfirmation = entry.acceptTerms && !entry.getProps().confirmationSent

    if (sendConfirmation) {
      // To mimic the previous behavior where status was set to 'PENDING' immediately
      entry.markConfirmationEmailSent() // Actually it's set to SENT inside, but previously PENDING was used. For now, mark as SENT.
    }

    await this.waitlistRepo.save(entry)

    if (sendConfirmation) {
      try {
        await this.emailService.sendWaitlistConfirmation(
          entry.getId!,
          entry.email,
          entry.getProps().firstName || undefined,
        )
      } catch (err) {
        console.error('Failed to send confirmation email', err)
        // Mark as failed
        entry.markConfirmationEmailFailed(err instanceof Error ? err.message : String(err))
        await this.waitlistRepo.save(entry)
      }
    }

    return {
      id: entry.getId,
      email: entry.email,
      createdAt: entry.getProps().createdAt.toISOString(),
      alreadyExists,
    }
  }
}
