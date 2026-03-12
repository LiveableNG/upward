import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto'
import type { WaitlistEntryResponse } from '@upward/shared-types'

@Injectable()
export class WaitlistService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponse> {
        const existing = await this.prisma.upward_waitlist.findUnique({
            where: { email: dto.email },
            select: { id: true, email: true, createdAt: true },
        })

        if (existing) {
            return {
                id: existing.id,
                email: existing.email,
                createdAt: existing.createdAt.toISOString(),
            }
        }

        const entry = await this.prisma.upward_waitlist.create({
            data: {
                email: dto.email,
                name: dto.name,
                phone: dto.phone,
                role: dto.role,
                benefits: dto.benefits ?? [],
                acceptTerms: dto.acceptTerms,
                wantsAmbassador: dto.wantsAmbassador ?? false,
            },
            select: { id: true, email: true, createdAt: true },
        })

        return {
            id: entry.id,
            email: entry.email,
            createdAt: entry.createdAt.toISOString(),
        }
    }

    async count(): Promise<number> {
        return this.prisma.upward_waitlist.count()
    }
}
