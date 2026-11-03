import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { IsOptional, IsString } from 'class-validator'

export class GetRentalExperimentStatsDto {
  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsString()
  variant?: string
}

export interface VariantMetric {
  variant: string
  assignedCount: number
  exposedCount: number
  viewedCount: number
  startedCount: number
  completedCount: number
  deferredCount: number
  dashboardEnteredCount: number
  activated7dCount: number
  recoveredCount: number
  avgTimeToCompleteMinutes: number | null
  completionRate: number // completed / exposed
  ittCompletionRate: number // completed / assigned
  activation7dRate: number // activated7d / assigned
  deferralRate: number // deferred / exposed
  recoveryRate: number // recovered / deferred
  dropOffRate: number // (started - completed) / started
}

export interface FunnelStage {
  step: number
  name: string
  requiredCount: number
  requiredPct: number
  deferrableCount: number
  deferrablePct: number
}

export interface ExperimentParticipant {
  userKey: string
  userEmail?: string | null
  variant: string
  isFallback: boolean
  assignedAt: string
  exposedAt?: string | null
  completedAt?: string | null
  deferredAt?: string | null
  activatedAt?: string | null
  status: 'COMPLETED' | 'DEFERRED' | 'IN_PROGRESS' | 'EXPOSED' | 'ASSIGNED'
}

export interface RentalExperimentStatsResponse {
  experimentKey: string
  dateRange: {
    startDate: string
    endDate: string
  }
  summary: {
    totalAssigned: number
    totalExposed: number
    totalCompleted: number
    totalActivated7d: number
    fallbackCount: number
    overallCompletionRate: number
    overallActivationRate: number
    dataFreshness: string
  }
  variants: {
    required: VariantMetric
    deferrable: VariantMetric
    fallback: VariantMetric
  }
  funnel: FunnelStage[]
  participants: ExperimentParticipant[]
}

@Injectable()
export class GetRentalExperimentStatsUseCase {
  private readonly logger = new Logger(GetRentalExperimentStatsUseCase.name)

  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: GetRentalExperimentStatsDto): Promise<RentalExperimentStatsResponse> {
    const end = dto.endDate ? new Date(dto.endDate) : new Date()
    const start = dto.startDate
      ? new Date(dto.startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    const experimentEvents = [
      'EXPERIMENT_ASSIGNED',
      'EXPERIMENT_EXPOSURE',
      'RENTAL_DETAILS_VIEWED',
      'RENTAL_DETAILS_STARTED',
      'RENTAL_DETAILS_COMPLETED',
      'RENTAL_DETAILS_DEFERRED',
      'DASHBOARD_ENTERED',
      'PAYMENT_SUCCESS',
      'KYC_SUCCESS',
      'DEPOSIT_COMPLETED',
    ]

    const rawEvents = await (this.prisma as any).upward_user_session_event.findMany({
      where: {
        eventName: { in: experimentEvents },
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        eventName: true,
        screenName: true,
        metadata: true,
        clientTimestamp: true,
        createdAt: true,
        session: {
          select: {
            userEmail: true,
            platform: true,
            clientType: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group events per unique user identifier
    interface UserAgg {
      userKey: string
      userEmail?: string | null
      variant: 'required-rental' | 'deferrable-rental' | 'fallback'
      isFallback: boolean
      assignedAt?: Date
      exposedAt?: Date
      viewedAt?: Date
      startedAt?: Date
      completedAt?: Date
      deferredAt?: Date
      dashboardEnteredAt?: Date
      activatedAt?: Date
    }

    const userAliasMap = new Map<string, string>()
    const usersMap = new Map<string, UserAgg>()

    for (const ev of rawEvents) {
      const meta = (ev.metadata || {}) as Record<string, any>

      // Check existing aliases in order of specificity
      let canonicalKey =
        (meta.userUuid && userAliasMap.get(meta.userUuid)) ||
        (ev.userId && userAliasMap.get(`user_${ev.userId}`)) ||
        (ev.session?.userEmail && userAliasMap.get(ev.session.userEmail)) ||
        (ev.sessionId && userAliasMap.get(`sess_${ev.sessionId}`))

      if (!canonicalKey) {
        canonicalKey =
          meta.userUuid ||
          (ev.userId ? `user_${ev.userId}` : null) ||
          ev.session?.userEmail ||
          `sess_${ev.sessionId}`
      }

      // Register aliases
      if (meta.userUuid) userAliasMap.set(meta.userUuid, canonicalKey)
      if (ev.userId) userAliasMap.set(`user_${ev.userId}`, canonicalKey)
      if (ev.session?.userEmail) userAliasMap.set(ev.session.userEmail, canonicalKey)
      if (ev.sessionId) userAliasMap.set(`sess_${ev.sessionId}`, canonicalKey)

      let userAgg = usersMap.get(canonicalKey)
      if (!userAgg) {
        userAgg = {
          userKey: canonicalKey,
          userEmail: ev.session?.userEmail || null,
          variant: 'deferrable-rental',
          isFallback: false,
        }
        usersMap.set(canonicalKey, userAgg)
      }

      if (ev.session?.userEmail && !userAgg.userEmail) {
        userAgg.userEmail = ev.session.userEmail
      }

      const evTime = new Date(ev.clientTimestamp || ev.createdAt)

      switch (ev.eventName) {
        case 'EXPERIMENT_ASSIGNED': {
          const varStr = meta.variant === 'required-rental' ? 'required-rental' : 'deferrable-rental'
          userAgg.isFallback = Boolean(meta.isFallback)
          userAgg.variant = meta.isFallback ? 'fallback' : varStr
          if (!userAgg.assignedAt || evTime < userAgg.assignedAt) {
            userAgg.assignedAt = evTime
          }
          break
        }
        case 'EXPERIMENT_EXPOSURE': {
          if (!userAgg.exposedAt || evTime < userAgg.exposedAt) {
            userAgg.exposedAt = evTime
          }
          if (meta.isFallback) {
            userAgg.isFallback = true
            userAgg.variant = 'fallback'
          } else if (meta.variant === 'required-rental' && !userAgg.isFallback) {
            userAgg.variant = 'required-rental'
          }
          break
        }
        case 'RENTAL_DETAILS_VIEWED': {
          if (!userAgg.viewedAt || evTime < userAgg.viewedAt) {
            userAgg.viewedAt = evTime
          }
          break
        }
        case 'RENTAL_DETAILS_STARTED': {
          if (!userAgg.startedAt || evTime < userAgg.startedAt) {
            userAgg.startedAt = evTime
          }
          break
        }
        case 'RENTAL_DETAILS_COMPLETED': {
          if (!userAgg.completedAt || evTime < userAgg.completedAt) {
            userAgg.completedAt = evTime
          }
          break
        }
        case 'RENTAL_DETAILS_DEFERRED': {
          if (!userAgg.deferredAt || evTime < userAgg.deferredAt) {
            userAgg.deferredAt = evTime
          }
          break
        }
        case 'DASHBOARD_ENTERED': {
          if (!userAgg.dashboardEnteredAt || evTime < userAgg.dashboardEnteredAt) {
            userAgg.dashboardEnteredAt = evTime
          }
          break
        }
        case 'PAYMENT_SUCCESS':
        case 'KYC_SUCCESS':
        case 'DEPOSIT_COMPLETED': {
          // Check if activation occurred within 7 days of user assignment (or first observed event)
          const baselineTime = userAgg.assignedAt || userAgg.exposedAt || evTime
          const diffDays = (evTime.getTime() - baselineTime.getTime()) / (1000 * 60 * 60 * 24)
          if (diffDays <= 7) {
            if (!userAgg.activatedAt || evTime < userAgg.activatedAt) {
              userAgg.activatedAt = evTime
            }
          }
          break
        }
      }
    }

    // Helper to calculate aggregations for a cohort
    const buildCohortMetric = (
      cohortUsers: UserAgg[],
      variantLabel: string,
    ): VariantMetric => {
      const assignedCount = cohortUsers.length
      const exposedCount = cohortUsers.filter((u) => u.exposedAt).length
      const viewedCount = cohortUsers.filter((u) => u.viewedAt).length
      const startedCount = cohortUsers.filter((u) => u.startedAt).length
      const completedCount = cohortUsers.filter((u) => u.completedAt).length
      const deferredCount = cohortUsers.filter((u) => u.deferredAt).length
      const dashboardEnteredCount = cohortUsers.filter((u) => u.dashboardEnteredAt).length
      const activated7dCount = cohortUsers.filter((u) => u.activatedAt).length

      // Recovery: deferred first, then completed later
      const recoveredCount = cohortUsers.filter(
        (u) => u.deferredAt && u.completedAt && u.completedAt.getTime() > u.deferredAt.getTime(),
      ).length

      // Time to complete in minutes
      const durations: number[] = []
      for (const u of cohortUsers) {
        if (u.completedAt && (u.assignedAt || u.exposedAt)) {
          const startT = (u.assignedAt || u.exposedAt)!.getTime()
          const endT = u.completedAt.getTime()
          if (endT >= startT) {
            durations.push((endT - startT) / (1000 * 60))
          }
        }
      }

      const avgTimeToCompleteMinutes =
        durations.length > 0
          ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
          : null

      const completionRate = exposedCount > 0 ? (completedCount / exposedCount) * 100 : 0
      const ittCompletionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0
      const activation7dRate = assignedCount > 0 ? (activated7dCount / assignedCount) * 100 : 0
      const deferralRate = exposedCount > 0 ? (deferredCount / exposedCount) * 100 : 0
      const recoveryRate = deferredCount > 0 ? (recoveredCount / deferredCount) * 100 : 0
      const dropOffRate =
        startedCount > 0 ? ((startedCount - completedCount) / startedCount) * 100 : 0

      return {
        variant: variantLabel,
        assignedCount,
        exposedCount,
        viewedCount,
        startedCount,
        completedCount,
        deferredCount,
        dashboardEnteredCount,
        activated7dCount,
        recoveredCount,
        avgTimeToCompleteMinutes,
        completionRate: Math.round(completionRate * 10) / 10,
        ittCompletionRate: Math.round(ittCompletionRate * 10) / 10,
        activation7dRate: Math.round(activation7dRate * 10) / 10,
        deferralRate: Math.round(deferralRate * 10) / 10,
        recoveryRate: Math.round(recoveryRate * 10) / 10,
        dropOffRate: Math.max(0, Math.round(dropOffRate * 10) / 10),
      }
    }

    const allUsers = Array.from(usersMap.values()).filter(
      (u) => Boolean(u.assignedAt || u.exposedAt),
    )
    const requiredUsers = allUsers.filter((u) => u.variant === 'required-rental')
    const deferrableUsers = allUsers.filter((u) => u.variant === 'deferrable-rental')
    const fallbackUsers = allUsers.filter((u) => u.variant === 'fallback')

    const requiredMetric = buildCohortMetric(requiredUsers, 'required-rental')
    const deferrableMetric = buildCohortMetric(deferrableUsers, 'deferrable-rental')
    const fallbackMetric = buildCohortMetric(fallbackUsers, 'fallback')

    // Funnel visualization steps
    const funnel: FunnelStage[] = [
      {
        step: 1,
        name: 'Assigned',
        requiredCount: requiredMetric.assignedCount,
        requiredPct: 100,
        deferrableCount: deferrableMetric.assignedCount,
        deferrablePct: 100,
      },
      {
        step: 2,
        name: 'Exposed',
        requiredCount: requiredMetric.exposedCount,
        requiredPct:
          requiredMetric.assignedCount > 0
            ? Math.round((requiredMetric.exposedCount / requiredMetric.assignedCount) * 100)
            : 0,
        deferrableCount: deferrableMetric.exposedCount,
        deferrablePct:
          deferrableMetric.assignedCount > 0
            ? Math.round((deferrableMetric.exposedCount / deferrableMetric.assignedCount) * 100)
            : 0,
      },
      {
        step: 3,
        name: 'Viewed Setup',
        requiredCount: requiredMetric.viewedCount,
        requiredPct:
          requiredMetric.exposedCount > 0
            ? Math.round((requiredMetric.viewedCount / requiredMetric.exposedCount) * 100)
            : 0,
        deferrableCount: deferrableMetric.viewedCount,
        deferrablePct:
          deferrableMetric.exposedCount > 0
            ? Math.round((deferrableMetric.viewedCount / deferrableMetric.exposedCount) * 100)
            : 0,
      },
      {
        step: 4,
        name: 'Started Flow',
        requiredCount: requiredMetric.startedCount,
        requiredPct:
          requiredMetric.exposedCount > 0
            ? Math.round((requiredMetric.startedCount / requiredMetric.exposedCount) * 100)
            : 0,
        deferrableCount: deferrableMetric.startedCount,
        deferrablePct:
          deferrableMetric.exposedCount > 0
            ? Math.round((deferrableMetric.startedCount / deferrableMetric.exposedCount) * 100)
            : 0,
      },
      {
        step: 5,
        name: 'Completed Setup',
        requiredCount: requiredMetric.completedCount,
        requiredPct:
          requiredMetric.exposedCount > 0
            ? Math.round((requiredMetric.completedCount / requiredMetric.exposedCount) * 100)
            : 0,
        deferrableCount: deferrableMetric.completedCount,
        deferrablePct:
          deferrableMetric.exposedCount > 0
            ? Math.round((deferrableMetric.completedCount / deferrableMetric.exposedCount) * 100)
            : 0,
      },
      {
        step: 6,
        name: '7-Day Core Activation',
        requiredCount: requiredMetric.activated7dCount,
        requiredPct:
          requiredMetric.assignedCount > 0
            ? Math.round((requiredMetric.activated7dCount / requiredMetric.assignedCount) * 100)
            : 0,
        deferrableCount: deferrableMetric.activated7dCount,
        deferrablePct:
          deferrableMetric.assignedCount > 0
            ? Math.round((deferrableMetric.activated7dCount / deferrableMetric.assignedCount) * 100)
            : 0,
      },
    ]

    // User-level drilldown list: bounded to 50 most recent
    const participants: ExperimentParticipant[] = allUsers
      .filter((u) => !dto.variant || u.variant === dto.variant)
      .slice(0, 50)
      .map((u) => {
        let status: ExperimentParticipant['status'] = 'ASSIGNED'
        if (u.completedAt) status = 'COMPLETED'
        else if (u.deferredAt) status = 'DEFERRED'
        else if (u.startedAt || u.viewedAt) status = 'IN_PROGRESS'
        else if (u.exposedAt) status = 'EXPOSED'

        return {
          userKey: u.userKey,
          userEmail: u.userEmail,
          variant: u.variant,
          isFallback: u.isFallback,
          assignedAt: (u.assignedAt || u.exposedAt || new Date()).toISOString(),
          exposedAt: u.exposedAt ? u.exposedAt.toISOString() : null,
          completedAt: u.completedAt ? u.completedAt.toISOString() : null,
          deferredAt: u.deferredAt ? u.deferredAt.toISOString() : null,
          activatedAt: u.activatedAt ? u.activatedAt.toISOString() : null,
          status,
        }
      })

    const totalAssigned = requiredMetric.assignedCount + deferrableMetric.assignedCount
    const totalExposed = requiredMetric.exposedCount + deferrableMetric.exposedCount
    const totalCompleted = requiredMetric.completedCount + deferrableMetric.completedCount
    const totalActivated = requiredMetric.activated7dCount + deferrableMetric.activated7dCount

    return {
      experimentKey: 'onboarding-rental-experience',
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      summary: {
        totalAssigned,
        totalExposed,
        totalCompleted,
        totalActivated7d: totalActivated,
        fallbackCount: fallbackMetric.assignedCount,
        overallCompletionRate: totalExposed > 0 ? Math.round((totalCompleted / totalExposed) * 1000) / 10 : 0,
        overallActivationRate: totalAssigned > 0 ? Math.round((totalActivated / totalAssigned) * 1000) / 10 : 0,
        dataFreshness: new Date().toISOString(),
      },
      variants: {
        required: requiredMetric,
        deferrable: deferrableMetric,
        fallback: fallbackMetric,
      },
      funnel,
      participants,
    }
  }
}
