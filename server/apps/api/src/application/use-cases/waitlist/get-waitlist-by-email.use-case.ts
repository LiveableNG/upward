import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { WaitlistEntryResponse, UserRole, WaitlistBenefit } from '@upward/shared-types'

const maskPhone = (str: string | null | undefined) => {
  if (!str) return undefined
  if (str.length <= 5) return '***'
  return `${str.slice(0, 3)}***${str.slice(-3)}`
}

@Injectable()
export class GetWaitlistByEmailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(email: string): Promise<WaitlistEntryResponse | null> {
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
}
