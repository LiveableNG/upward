import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto'
import { WaitlistEntryResponse, UserRole, WaitlistBenefit } from '@upward/shared-types'

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponse> {
    const existing = await this.prisma.upward_waitlist.findUnique({
      where: { email: dto.email },
      select: { id: true },
    })

    const updateData: Record<string, unknown> = {}
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName
    if (dto.phone !== undefined) updateData.phone = dto.phone
    if (dto.role !== undefined) updateData.role = dto.role
    if (dto.benefits !== undefined && dto.benefits.length > 0) updateData.benefits = dto.benefits
    if (dto.acceptTerms !== undefined) updateData.acceptTerms = dto.acceptTerms
    if (dto.wantsAmbassador !== undefined) updateData.wantsAmbassador = dto.wantsAmbassador
    if (dto.country !== undefined) updateData.country = dto.country
    if (dto.city !== undefined) updateData.city = dto.city
    if (dto.selectedSession !== undefined) updateData.selectedSession = dto.selectedSession

    const entry = await this.prisma.upward_waitlist.upsert({
      where: { email: dto.email },
      update: updateData,
      create: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        benefits: dto.benefits ?? [],
        acceptTerms: dto.acceptTerms ?? false,
        wantsAmbassador: dto.wantsAmbassador ?? false,
        country: dto.country,
        city: dto.city,
        selectedSession: dto.selectedSession,
      },
      select: { id: true, email: true, createdAt: true },
    })

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
      phone: entry.phone ?? undefined,
      role: entry.role as UserRole | undefined,
      benefits: entry.benefits as WaitlistBenefit[],
      acceptTerms: entry.acceptTerms,
      wantsAmbassador: entry.wantsAmbassador,
      country: entry.country ?? undefined,
      city: entry.city ?? undefined,
      selectedSession: entry.selectedSession ?? undefined,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    } as WaitlistEntryResponse
  }
}
