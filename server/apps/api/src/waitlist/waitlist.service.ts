import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto'
import { TrackInteractionDto } from './dto/track-interaction.dto'
import { WaitlistEntryResponse, UserRole, WaitlistBenefit } from '@upward/shared-types'
import { EmailService } from '../email/email.service'

const maskPhone = (str: string | null | undefined) => {
  if (!str) return undefined
  if (str.length <= 5) return '***'
  return `${str.slice(0, 3)}***${str.slice(-3)}`
}

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponse> {
    const existing = await this.prisma.upward_waitlist.findUnique({
      where: { email: dto.email },
    })

    const updateData: Record<string, unknown> = {}

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName

    if (dto.phone !== undefined && !dto.phone.includes('*')) {
      updateData.phone = dto.phone
    }

    if (dto.role !== undefined) updateData.role = dto.role
    if (dto.benefits !== undefined && dto.benefits.length > 0) updateData.benefits = dto.benefits
    if (dto.acceptTerms !== undefined) updateData.acceptTerms = dto.acceptTerms
    if (dto.wantsAmbassador !== undefined) updateData.wantsAmbassador = dto.wantsAmbassador
    if (dto.country !== undefined) updateData.country = dto.country
    if (dto.city !== undefined) updateData.city = dto.city
    if (dto.selectedSession !== undefined) updateData.selectedSession = dto.selectedSession
    if (dto.abVariant !== undefined) updateData.abVariant = dto.abVariant

    const entry = await this.prisma.upward_waitlist.upsert({
      where: { email: dto.email },
      update: updateData,
      create: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone && !dto.phone.includes('*') ? dto.phone : undefined,
        role: dto.role,
        benefits: dto.benefits ?? [],
        acceptTerms: dto.acceptTerms ?? false,
        wantsAmbassador: dto.wantsAmbassador ?? false,
        country: dto.country,
        city: dto.city,
        selectedSession: dto.selectedSession,
        abVariant: dto.abVariant,
      },
    })

    if (entry.acceptTerms && !entry.confirmationSent) {
      const { count } = await this.prisma.upward_waitlist.updateMany({
        where: {
          id: entry.id,
          acceptTerms: true,
          confirmationSent: false,
        },
        data: {
          confirmationSent: true,
          confirmationEmailStatus: 'PENDING',
        },
      })

      if (count > 0) {
        this.emailService
          .sendWaitlistConfirmation(entry.id, entry.email, entry.firstName ?? undefined)
          .catch((err) => {
            console.error('Failed to send confirmation email', err)
          })
      }
    }

    return {
      id: entry.id,
      email: entry.email,
      createdAt: entry.createdAt.toISOString(),
      alreadyExists: !!existing,
    }
  }

  async count(): Promise<number> {
    return this.prisma.upward_waitlist.count()
  }

  async findByEmail(email: string): Promise<WaitlistEntryResponse | null> {
    const entry = await this.prisma.upward_waitlist.findUnique({
      where: { email },
    })

    if (!entry) return null

    return {
      id: entry.id,
      email: entry.email,
      firstName: entry.firstName ?? undefined,
      lastName: entry.lastName ?? undefined,
      phone: maskPhone(entry.phone),
      role: entry.role as UserRole | undefined,
      benefits: entry.benefits as WaitlistBenefit[],
      acceptTerms: entry.acceptTerms,
      wantsAmbassador: entry.wantsAmbassador,
      country: entry.country ?? undefined,
      city: entry.city ?? undefined,
      selectedSession: entry.selectedSession ?? undefined,
      abVariant: entry.abVariant ?? undefined,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    } as WaitlistEntryResponse
  }

  async trackInteraction(dto: TrackInteractionDto, ip?: string, ua?: string): Promise<void> {
    await this.prisma.upward_interaction.create({
      data: {
        visitorId: dto.visitorId,
        type: dto.type,
        target: dto.target,
        abVariant: dto.abVariant,
        ipAddress: ip,
        userAgent: ua,
      },
    })
  }
}
