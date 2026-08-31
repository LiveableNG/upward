import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IUniversityApplicationRepository,
  ApplicationStats,
} from '../../domains/university-application/university-application.repository'
import {
  UniversityApplication,
  UniversityApplicationProps,
} from '../../domains/university-application/university-application.entity'

@Injectable()
export class PrismaUniversityApplicationRepository
  implements IUniversityApplicationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(application: UniversityApplication): Promise<UniversityApplication> {
    const rawData = application.toObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (this.prisma as any).upward_university_application.upsert({
      where: { id: rawData.id },
      create: {
        id: rawData.id,
        name: rawData.name,
        whatsapp: rawData.whatsapp,
        email: rawData.email,
        city: rawData.city,
        ageBracket: rawData.ageBracket,
        occupation: rawData.occupation ?? null,
        experienceLevel: rawData.experienceLevel ?? null,
        goals: rawData.goals ?? null,
        commitment: rawData.commitment,
        why: rawData.why,
        timing: rawData.timing ?? null,
        isScholarship: rawData.isScholarship ?? false,
        scholarshipVideoUrl: rawData.scholarshipVideoUrl ?? null,
        status: rawData.status || 'SUBMITTED',
        applicationFee: rawData.applicationFee ?? 5000,
        feeStatus: rawData.feeStatus || 'PENDING',
        paymentRef: rawData.paymentRef ?? null,
        notes: rawData.notes ?? null,
      },
      update: {
        isScholarship: rawData.isScholarship,
        scholarshipVideoUrl: rawData.scholarshipVideoUrl ?? null,
        status: rawData.status,
        feeStatus: rawData.feeStatus,
        paymentRef: rawData.paymentRef ?? null,
        notes: rawData.notes ?? null,
      },
    })

    return UniversityApplication.restore(created as UniversityApplicationProps)
  }

  async findById(id: string): Promise<UniversityApplication | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (this.prisma as any).upward_university_application.findUnique({
      where: { id },
    })

    if (!record) return null

    return UniversityApplication.restore(record as UniversityApplicationProps)
  }

  async findByEmail(email: string): Promise<UniversityApplication | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (this.prisma as any).upward_university_application.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) return null

    return UniversityApplication.restore(record as UniversityApplicationProps)
  }

  async findByPaymentRef(paymentRef: string): Promise<UniversityApplication | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (this.prisma as any).upward_university_application.findFirst({
      where: { paymentRef },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) return null

    return UniversityApplication.restore(record as UniversityApplicationProps)
  }

  async findAll(params?: {
    status?: string
    feeStatus?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ applications: UniversityApplication[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (params?.status) {
      where.status = params.status.toUpperCase()
    }
    if (params?.feeStatus) {
      where.feeStatus = params.feeStatus.toUpperCase()
    }

    if (params?.search && params.search.trim().length > 0) {
      const query = params.search.trim()
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { whatsapp: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [records, total] = await Promise.all([
      (this.prisma as any).upward_university_application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      (this.prisma as any).upward_university_application.count({ where }),
    ])

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applications: records.map((record: any) =>
        UniversityApplication.restore(record as UniversityApplicationProps),
      ),
      total,
    }
  }

  async getStats(): Promise<ApplicationStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [totalApplications, pendingReviewCount, admittedCount, feePaidCount] = await Promise.all([
      (this.prisma as any).upward_university_application.count(),
      (this.prisma as any).upward_university_application.count({ where: { status: 'SUBMITTED' } }),
      (this.prisma as any).upward_university_application.count({ where: { status: 'ADMITTED' } }),
      (this.prisma as any).upward_university_application.count({ where: { feeStatus: 'PAID' } }),
    ])

    return {
      totalApplications,
      pendingReviewCount,
      admittedCount,
      feePaidCount,
    }
  }
}
