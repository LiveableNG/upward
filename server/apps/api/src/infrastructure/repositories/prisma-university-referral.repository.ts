import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { IUniversityReferralRepository } from '../../domains/university-referral/university-referral.repository'
import { UniversityReferral } from '../../domains/university-referral/university-referral.entity'
import { getPhoneSearchVariants, normalizeEmail } from '../../shared/utils/phone-normalizer'

@Injectable()
export class PrismaUniversityReferralRepository implements IUniversityReferralRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get referralModel() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = this.prisma as any
    return (
      p.upward_university_referral ||
      p.upwardUniversityReferral ||
      p.UniversityReferral ||
      p.universityReferral ||
      p.university_referral
    )
  }

  async save(referral: UniversityReferral): Promise<UniversityReferral> {
    const raw = referral.toObject()

    if (this.referralModel) {
      const created = await this.referralModel.create({
        data: {
          id: raw.id,
          referrerEarlyAccessId: raw.referrerEarlyAccessId ?? null,
          referrerName: raw.referrerName,
          referrerEmail: raw.referrerEmail ?? null,
          referrerPhone: raw.referrerPhone,
          referredName: raw.referredName ?? null,
          referredEmail: raw.referredEmail ?? null,
          referredPhone: raw.referredPhone ?? null,
          status: raw.status,
          rewardPercentage: raw.rewardPercentage,
          rewardAmount: raw.rewardAmount ?? null,
          rewardStatus: raw.rewardStatus,
          programFeePaid: raw.programFeePaid ?? null,
          paymentRef: raw.paymentRef ?? null,
          joinedAt: raw.joinedAt ?? null,
          emailSent: raw.emailSent,
          emailSentAt: raw.emailSentAt ?? null,
          ineligibleReason: raw.ineligibleReason ?? null,
          notes: raw.notes ?? null,
        },
      })
      return this.toEntity(created)
    }

    // Fallback via SQL
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "upward_university_referral" 
       ("id", "referrerEarlyAccessId", "referrerName", "referrerEmail", "referrerPhone", "referredName", "referredEmail", "referredPhone", "status", "rewardPercentage", "rewardAmount", "rewardStatus", "programFeePaid", "paymentRef", "joinedAt", "emailSent", "emailSentAt", "ineligibleReason", "notes", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET
       "referrerName" = EXCLUDED."referrerName",
       "referrerEmail" = EXCLUDED."referrerEmail",
       "referrerPhone" = EXCLUDED."referrerPhone",
       "referredName" = EXCLUDED."referredName",
       "referredEmail" = EXCLUDED."referredEmail",
       "referredPhone" = EXCLUDED."referredPhone",
       "status" = EXCLUDED."status",
       "rewardPercentage" = EXCLUDED."rewardPercentage",
       "rewardAmount" = EXCLUDED."rewardAmount",
       "rewardStatus" = EXCLUDED."rewardStatus",
       "programFeePaid" = EXCLUDED."programFeePaid",
       "paymentRef" = EXCLUDED."paymentRef",
       "joinedAt" = EXCLUDED."joinedAt",
       "emailSent" = EXCLUDED."emailSent",
       "emailSentAt" = EXCLUDED."emailSentAt",
       "ineligibleReason" = EXCLUDED."ineligibleReason",
       "notes" = EXCLUDED."notes",
       "updatedAt" = NOW()`,
      raw.id,
      raw.referrerEarlyAccessId ?? null,
      raw.referrerName,
      raw.referrerEmail ?? null,
      raw.referrerPhone,
      raw.referredName ?? null,
      raw.referredEmail ?? null,
      raw.referredPhone ?? null,
      raw.status,
      raw.rewardPercentage,
      raw.rewardAmount ?? null,
      raw.rewardStatus,
      raw.programFeePaid ?? null,
      raw.paymentRef ?? null,
      raw.joinedAt ?? null,
      raw.emailSent,
      raw.emailSentAt ?? null,
      raw.ineligibleReason ?? null,
      raw.notes ?? null,
    )

    return referral
  }

  async saveMany(referrals: UniversityReferral[]): Promise<UniversityReferral[]> {
    const results: UniversityReferral[] = []
    for (const r of referrals) {
      const saved = await this.save(r)
      results.push(saved)
    }
    return results
  }

  async findById(id: string): Promise<UniversityReferral | null> {
    if (this.referralModel) {
      const record = await this.referralModel.findUnique({
        where: { id },
      })
      return record ? this.toEntity(record) : null
    }

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "upward_university_referral" WHERE "id" = $1 LIMIT 1`,
        id
      )
      return rows && rows.length > 0 ? this.toEntity(rows[0]) : null
    } catch {
      return null
    }
  }

  async findByReferredContact(email?: string | null, phone?: string | null): Promise<UniversityReferral | null> {
    const normEmail = normalizeEmail(email)
    const phoneVariants = phone ? getPhoneSearchVariants(phone) : []

    if (this.referralModel) {
      const conditions: any[] = []
      if (normEmail) {
        conditions.push({ referredEmail: { equals: normEmail, mode: 'insensitive' } })
      }
      if (phoneVariants.length > 0) {
        conditions.push({ referredPhone: { in: phoneVariants } })
      }

      if (conditions.length === 0) return null

      const record = await this.referralModel.findFirst({
        where: {
          OR: conditions,
        },
        orderBy: { createdAt: 'desc' },
      })

      return record ? this.toEntity(record) : null
    }

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "upward_university_referral" 
         WHERE ("referredEmail" ILIKE $1 OR "referredPhone" = ANY($2::text[]))
         ORDER BY "createdAt" DESC LIMIT 1`,
        normEmail || '',
        phoneVariants
      )
      return rows && rows.length > 0 ? this.toEntity(rows[0]) : null
    } catch {
      return null
    }
  }

  /**
   * Checks whether the contact is already in any information list / application / waitlist.
   * Someone counts as referred ONLY if they are NOT in the info list before (by email or phone).
   */
  async checkInInfoList(email?: string | null, phone?: string | null): Promise<boolean> {
    const normEmail = normalizeEmail(email)
    const phoneVariants = phone ? getPhoneSearchVariants(phone) : []

    if (!normEmail && phoneVariants.length === 0) {
      return false
    }

    // 1. Check upward_early_access (info session registrants)
    const earlyAccessConditions: any[] = []
    if (normEmail) {
      earlyAccessConditions.push({ email: { equals: normEmail, mode: 'insensitive' } })
    }
    if (phoneVariants.length > 0) {
      earlyAccessConditions.push({ whatsapp: { in: phoneVariants } })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earlyAccessModel = (this.prisma as any).upward_early_access || (this.prisma as any).upwardEarlyAccess
    if (earlyAccessModel) {
      const earlyAccessMatch = await earlyAccessModel.findFirst({
        where: { OR: earlyAccessConditions },
      })
      if (earlyAccessMatch) {
        return true
      }
    }

    // 2. Check upward_university_application
    const appConditions: any[] = []
    if (normEmail) {
      appConditions.push({ email: { equals: normEmail, mode: 'insensitive' } })
    }
    if (phoneVariants.length > 0) {
      appConditions.push({ whatsapp: { in: phoneVariants } })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appModel = (this.prisma as any).upward_university_application || (this.prisma as any).upwardUniversityApplication
    if (appModel) {
      const appMatch = await appModel.findFirst({
        where: { OR: appConditions },
      })
      if (appMatch) {
        return true
      }
    }

    // 3. Check upward_waitlist
    const waitlistConditions: any[] = []
    if (normEmail) {
      waitlistConditions.push({ email: { equals: normEmail, mode: 'insensitive' } })
    }
    if (phoneVariants.length > 0) {
      waitlistConditions.push({ phone: { in: phoneVariants } })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const waitlistModel = (this.prisma as any).upward_waitlist || (this.prisma as any).upwardWaitlist
    if (waitlistModel) {
      const waitlistMatch = await waitlistModel.findFirst({
        where: { OR: waitlistConditions },
      })
      if (waitlistMatch) {
        return true
      }
    }

    // 4. Check if already referred by someone else (active referral)
    if (this.referralModel) {
      const referralConditions: any[] = []
      if (normEmail) {
        referralConditions.push({ referredEmail: { equals: normEmail, mode: 'insensitive' } })
      }
      if (phoneVariants.length > 0) {
        referralConditions.push({ referredPhone: { in: phoneVariants } })
      }

      const referralMatch = await this.referralModel.findFirst({
        where: {
          status: { not: 'INELIGIBLE' },
          OR: referralConditions,
        },
      })
      if (referralMatch) {
        return true
      }
    } else {
      try {
        const rows: any[] = await this.prisma.$queryRawUnsafe(
          `SELECT id FROM "upward_university_referral" 
           WHERE "status" != 'INELIGIBLE' 
           AND (("referredEmail" IS NOT NULL AND "referredEmail" ILIKE $1) OR ("referredPhone" = ANY($2::text[]))) 
           LIMIT 1`,
          normEmail || '',
          phoneVariants
        )
        if (rows && rows.length > 0) return true
      } catch {
        // Table or columns might not exist yet
      }
    }

    return false
  }

  async findByReferrer(phone: string, email?: string | null): Promise<UniversityReferral[]> {
    const phoneVariants = getPhoneSearchVariants(phone)
    const normEmail = normalizeEmail(email)

    if (this.referralModel) {
      const conditions: any[] = []
      if (phoneVariants.length > 0) {
        conditions.push({ referrerPhone: { in: phoneVariants } })
      }
      if (normEmail) {
        conditions.push({ referrerEmail: { equals: normEmail, mode: 'insensitive' } })
      }

      const records = await this.referralModel.findMany({
        where: { OR: conditions },
        orderBy: { createdAt: 'desc' },
      })

      return records.map((r: any) => this.toEntity(r))
    }

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "upward_university_referral" 
         WHERE ("referrerPhone" = ANY($1::text[]) OR ("referrerEmail" IS NOT NULL AND "referrerEmail" ILIKE $2))
         ORDER BY "createdAt" DESC`,
        phoneVariants,
        normEmail || ''
      )
      return (rows || []).map((r: any) => this.toEntity(r))
    } catch {
      return []
    }
  }

  async findAll(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    rewardStatus?: string
  }): Promise<{ data: UniversityReferral[]; total: number }> {
    const page = params.page || 1
    const limit = params.limit || 50
    const skip = (page - 1) * limit

    if (this.referralModel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      if (params.status && params.status !== 'ALL') {
        where.status = params.status.toUpperCase()
      }

      if (params.rewardStatus && params.rewardStatus !== 'ALL') {
        where.rewardStatus = params.rewardStatus.toUpperCase()
      }

      if (params.search && params.search.trim().length > 0) {
        const q = params.search.trim()
        where.OR = [
          { referrerName: { contains: q, mode: 'insensitive' } },
          { referrerEmail: { contains: q, mode: 'insensitive' } },
          { referrerPhone: { contains: q, mode: 'insensitive' } },
          { referredName: { contains: q, mode: 'insensitive' } },
          { referredEmail: { contains: q, mode: 'insensitive' } },
          { referredPhone: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ]
      }

      const [records, total] = await Promise.all([
        this.referralModel.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        this.referralModel.count({ where }),
      ])

      return {
        data: records.map((r: any) => this.toEntity(r)),
        total,
      }
    }

    try {
      const records: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "upward_university_referral" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
        limit,
        skip
      )
      const countRes: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "upward_university_referral"`
      )
      const total = countRes && countRes[0] ? countRes[0].count : 0

      return {
        data: (records || []).map((r: any) => this.toEntity(r)),
        total,
      }
    } catch {
      return { data: [], total: 0 }
    }
  }

  async getStats(): Promise<{
    totalReferrals: number
    eligibleReferrals: number
    ineligibleReferrals: number
    joinedReferrals: number
    totalRewardAmountEarned: number
    totalRewardAmountPaid: number
  }> {
    if (this.referralModel) {
      const [
        totalReferrals,
        ineligibleReferrals,
        joinedReferrals,
        earnedAggregate,
        paidAggregate,
      ] = await Promise.all([
        this.referralModel.count(),
        this.referralModel.count({ where: { status: 'INELIGIBLE' } }),
        this.referralModel.count({ where: { status: { in: ['JOINED', 'PAID'] } } }),
        this.referralModel.aggregate({
          _sum: { rewardAmount: true },
          where: { status: { in: ['JOINED', 'PAID'] } },
        }),
        this.referralModel.aggregate({
          _sum: { rewardAmount: true },
          where: { rewardStatus: 'PAID' },
        }),
      ])

      const eligibleReferrals = Math.max(0, totalReferrals - ineligibleReferrals)
      const totalRewardAmountEarned = earnedAggregate._sum?.rewardAmount || 0
      const totalRewardAmountPaid = paidAggregate._sum?.rewardAmount || 0

      return {
        totalReferrals,
        eligibleReferrals,
        ineligibleReferrals,
        joinedReferrals,
        totalRewardAmountEarned,
        totalRewardAmountPaid,
      }
    }

    try {
      const statsRes: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*)::int AS "totalReferrals",
          COUNT(*) FILTER (WHERE "status" = 'INELIGIBLE')::int AS "ineligibleReferrals",
          COUNT(*) FILTER (WHERE "status" IN ('JOINED', 'PAID'))::int AS "joinedReferrals",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "status" IN ('JOINED', 'PAID')), 0)::float AS "totalRewardAmountEarned",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" = 'PAID'), 0)::float AS "totalRewardAmountPaid"
        FROM "upward_university_referral"
      `)
      const row = statsRes && statsRes[0] ? statsRes[0] : {}
      const totalReferrals = row.totalReferrals || 0
      const ineligibleReferrals = row.ineligibleReferrals || 0
      return {
        totalReferrals,
        eligibleReferrals: Math.max(0, totalReferrals - ineligibleReferrals),
        ineligibleReferrals,
        joinedReferrals: row.joinedReferrals || 0,
        totalRewardAmountEarned: row.totalRewardAmountEarned || 0,
        totalRewardAmountPaid: row.totalRewardAmountPaid || 0,
      }
    } catch {
      return {
        totalReferrals: 0,
        eligibleReferrals: 0,
        ineligibleReferrals: 0,
        joinedReferrals: 0,
        totalRewardAmountEarned: 0,
        totalRewardAmountPaid: 0,
      }
    }
  }

  async update(referral: UniversityReferral): Promise<UniversityReferral> {
    const raw = referral.toObject()

    if (this.referralModel) {
      const updated = await this.referralModel.update({
        where: { id: raw.id },
        data: {
          referrerName: raw.referrerName,
          referrerEmail: raw.referrerEmail ?? null,
          referrerPhone: raw.referrerPhone,
          referredName: raw.referredName ?? null,
          referredEmail: raw.referredEmail ?? null,
          referredPhone: raw.referredPhone ?? null,
          status: raw.status,
          rewardPercentage: raw.rewardPercentage,
          rewardAmount: raw.rewardAmount ?? null,
          rewardStatus: raw.rewardStatus,
          programFeePaid: raw.programFeePaid ?? null,
          paymentRef: raw.paymentRef ?? null,
          joinedAt: raw.joinedAt ?? null,
          ineligibleReason: raw.ineligibleReason ?? null,
          notes: raw.notes ?? null,
          emailSent: raw.emailSent,
          emailSentAt: raw.emailSentAt ?? null,
        },
      })
      return this.toEntity(updated)
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE "upward_university_referral" SET
       "referrerName" = $1,
       "referrerEmail" = $2,
       "referrerPhone" = $3,
       "referredName" = $4,
       "referredEmail" = $5,
       "referredPhone" = $6,
       "status" = $7,
       "rewardPercentage" = $8,
       "rewardAmount" = $9,
       "rewardStatus" = $10,
       "programFeePaid" = $11,
       "paymentRef" = $12,
       "joinedAt" = $13,
       "ineligibleReason" = $14,
       "notes" = $15,
       "emailSent" = $16,
       "emailSentAt" = $17,
       "updatedAt" = NOW()
       WHERE "id" = $18`,
      raw.referrerName,
      raw.referrerEmail ?? null,
      raw.referrerPhone,
      raw.referredName ?? null,
      raw.referredEmail ?? null,
      raw.referredPhone ?? null,
      raw.status,
      raw.rewardPercentage,
      raw.rewardAmount ?? null,
      raw.rewardStatus,
      raw.programFeePaid ?? null,
      raw.paymentRef ?? null,
      raw.joinedAt ?? null,
      raw.ineligibleReason ?? null,
      raw.notes ?? null,
      raw.emailSent,
      raw.emailSentAt ?? null,
      raw.id
    )

    return referral
  }

  async delete(id: string): Promise<void> {
    if (this.referralModel) {
      await this.referralModel.delete({
        where: { id },
      })
      return
    }

    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "upward_university_referral" WHERE "id" = $1`,
      id
    )
  }

  private toEntity(raw: any): UniversityReferral {
    return UniversityReferral.restore({
      id: raw.id,
      referrerEarlyAccessId: raw.referrerEarlyAccessId,
      referrerName: raw.referrerName,
      referrerEmail: raw.referrerEmail,
      referrerPhone: raw.referrerPhone,
      referredName: raw.referredName,
      referredEmail: raw.referredEmail,
      referredPhone: raw.referredPhone,
      status: raw.status,
      rewardPercentage: typeof raw.rewardPercentage === 'number' ? raw.rewardPercentage : parseFloat(raw.rewardPercentage || '10'),
      rewardAmount: raw.rewardAmount != null ? (typeof raw.rewardAmount === 'number' ? raw.rewardAmount : parseFloat(raw.rewardAmount)) : null,
      rewardStatus: raw.rewardStatus,
      programFeePaid: raw.programFeePaid != null ? (typeof raw.programFeePaid === 'number' ? raw.programFeePaid : parseFloat(raw.programFeePaid)) : null,
      paymentRef: raw.paymentRef,
      joinedAt: raw.joinedAt ? new Date(raw.joinedAt) : null,
      emailSent: Boolean(raw.emailSent),
      emailSentAt: raw.emailSentAt ? new Date(raw.emailSentAt) : null,
      ineligibleReason: raw.ineligibleReason,
      notes: raw.notes,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    })
  }
}
