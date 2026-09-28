import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IUniversityHireRequestRepository,
  UniversityHireRequestFilterParams,
  UniversityHireRequestStats,
} from '../../domains/university-hire-request/university-hire-request.repository'
import { UniversityHireRequest } from '../../domains/university-hire-request/university-hire-request.entity'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaUniversityHireRequestRepository implements IUniversityHireRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(hireRequest: UniversityHireRequest): Promise<UniversityHireRequest> {
    const data = hireRequest.toObject()
    const saved = await (this.prisma as any).upward_university_hire_request.create({
      data: {
        id: data.id,
        companyName: data.companyName,
        contactName: data.contactName,
        contactRole: data.contactRole,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        city: data.city,
        placementType: data.placementType,
        rolesNeeded: data.rolesNeeded as Prisma.InputJsonValue,
        openingsCount: data.openingsCount,
        compensationType: data.compensationType,
        startDate: data.startDate,
        jobDescription: data.jobDescription,
        sourceIdentifier: data.sourceIdentifier,
        abVariant: data.abVariant,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    })

    return this.mapToDomain(saved)
  }

  async findById(id: string): Promise<UniversityHireRequest | null> {
    const record = await (this.prisma as any).upward_university_hire_request.findUnique({
      where: { id },
    })
    return record ? this.mapToDomain(record) : null
  }

  async findAll(
    params: UniversityHireRequestFilterParams,
  ): Promise<{ data: UniversityHireRequest[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1
    const limit = params.limit && params.limit > 0 ? params.limit : 20
    const skip = (page - 1) * limit

    const where: any = {}

    if (params.status) {
      where.status = params.status
    }
    if (params.industry) {
      where.industry = params.industry
    }
    if (params.placementType) {
      where.placementType = params.placementType
    }
    if (params.search) {
      const s = params.search.trim()
      where.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { contactName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      (this.prisma as any).upward_university_hire_request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).upward_university_hire_request.count({ where }),
    ])

    return {
      data: (records as any[]).map((r: any) => this.mapToDomain(r)),
      total,
    }
  }

  async getStats(): Promise<UniversityHireRequestStats> {
    const [totalRequests, pendingRequests, contactedRequests, matchedRequests] =
      await Promise.all([
        (this.prisma as any).upward_university_hire_request.count(),
        (this.prisma as any).upward_university_hire_request.count({ where: { status: 'PENDING' } }),
        (this.prisma as any).upward_university_hire_request.count({ where: { status: 'CONTACTED' } }),
        (this.prisma as any).upward_university_hire_request.count({ where: { status: 'MATCHED' } }),
      ])

    return {
      totalRequests,
      pendingRequests,
      contactedRequests,
      matchedRequests,
    }
  }

  async update(hireRequest: UniversityHireRequest): Promise<UniversityHireRequest> {
    const data = hireRequest.toObject()
    if (!data.id) throw new Error('ID is required to update hire request')

    const updated = await (this.prisma as any).upward_university_hire_request.update({
      where: { id: data.id },
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        contactRole: data.contactRole,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        city: data.city,
        placementType: data.placementType,
        rolesNeeded: data.rolesNeeded as Prisma.InputJsonValue,
        openingsCount: data.openingsCount,
        compensationType: data.compensationType,
        startDate: data.startDate,
        jobDescription: data.jobDescription,
        status: data.status,
        notes: data.notes,
        updatedAt: new Date(),
      },
    })

    return this.mapToDomain(updated)
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).upward_university_hire_request.delete({
      where: { id },
    })
  }

  private mapToDomain(record: any): UniversityHireRequest {
    return UniversityHireRequest.restore({
      id: record.id,
      companyName: record.companyName,
      contactName: record.contactName,
      contactRole: record.contactRole,
      email: record.email,
      phone: record.phone,
      industry: record.industry,
      city: record.city,
      placementType: record.placementType,
      rolesNeeded: Array.isArray(record.rolesNeeded) ? record.rolesNeeded : [],
      openingsCount: record.openingsCount || '1',
      compensationType: record.compensationType,
      startDate: record.startDate,
      jobDescription: record.jobDescription,
      sourceIdentifier: record.sourceIdentifier,
      abVariant: record.abVariant,
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}
