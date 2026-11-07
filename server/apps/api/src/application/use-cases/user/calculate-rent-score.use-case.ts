import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  RENT_CYCLE_REPOSITORY,
  IRentCycleRepository,
} from '../../../domains/scoring/rent-cycle.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export type TimelinessTier =
  | 'PAID_EARLY'
  | 'PAID_SLIGHTLY_EARLY'
  | 'PAID_ON_DUE_DATE'
  | 'GRACE_PERIOD'
  | 'LATE_MINOR'
  | 'LATE_MODERATE'
  | 'LATE_SEVERE'
  | 'DEFAULT'
  | 'PENDING'

export interface ScoreHistoryEvent {
  id: string
  date: string
  title: string
  subtitle: string
  delta: number
  scoreAfter: number
  category:
    | 'RENT_EARLY'
    | 'RENT_ON_TIME'
    | 'RENT_LATE'
    | 'GOODTENANTS_IMPORT'
    | 'RENT_VAULT'
    | 'STARTER'
}

const STREAK_MILESTONES = [0, 40, 80, 110, 125, 140, 150] as const
const TENURE_MILESTONES = [0, 12, 24, 35, 40, 45, 50] as const

function toUtcCalendarMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
}

function getCalendarDaysDiff(paidAt: Date, dueDate: Date): number {
  const paidMidnight = toUtcCalendarMidnight(paidAt)
  const dueMidnight = toUtcCalendarMidnight(dueDate)
  return Math.round((paidMidnight - dueMidnight) / (1000 * 60 * 60 * 24))
}

/**
 * V2 Timeliness Scoring (Max 200 points, normalized to 0.0 - 1.0 ratio):
 * - Paid Early (7+ days before due date): 200 / 200 pts (1.000) [185 base + 15 early-bird bonus]
 * - Paid Slightly Early (1-6 days before due date): 190 / 200 pts (0.950) [185 base + 5 early bonus]
 * - Paid On Due Date (0 to +2 days bank transfer grace window): 185 / 200 pts (0.925)
 * - 3 to 14 Days Late: Smooth linear dip from 180 pts (0.90) to 140 pts (0.70)
 * - 15 to 30 Days Late: Moderate penalty from 140 pts (0.70) to 100 pts (0.50)
 * - 31 to 90 Days Late: Severe penalty from 100 pts (0.50) to 20 pts (0.10) — no Day-31 cliff
 * - 91 to 365 Days Late: 20 pts (0.10) down to 0 pts (0.00)
 */
export function evaluateTimelinessFromDaysDiff(daysDiff: number): {
  points: number
  ratio: number
  tier: TimelinessTier
  isOnTime: boolean
} {
  if (daysDiff <= -7) {
    return { points: 200, ratio: 1.0, tier: 'PAID_EARLY', isOnTime: true }
  }
  if (daysDiff <= -1) {
    return { points: 190, ratio: 190 / 200, tier: 'PAID_SLIGHTLY_EARLY', isOnTime: true }
  }
  if (daysDiff <= 2) {
    return {
      points: 185,
      ratio: 185 / 200,
      tier: daysDiff === 0 ? 'PAID_ON_DUE_DATE' : 'GRACE_PERIOD',
      isOnTime: true,
    }
  }
  if (daysDiff <= 14) {
    const points = 180 - ((daysDiff - 3) / 11) * 40
    return { points, ratio: points / 200, tier: 'LATE_MINOR', isOnTime: false }
  }
  if (daysDiff <= 30) {
    const points = 140 - ((daysDiff - 14) / 16) * 40
    return { points, ratio: points / 200, tier: 'LATE_MODERATE', isOnTime: false }
  }
  if (daysDiff <= 90) {
    const points = 100 - ((daysDiff - 30) / 60) * 80
    return { points, ratio: points / 200, tier: 'LATE_SEVERE', isOnTime: false }
  }
  if (daysDiff <= 365) {
    const points = Math.max(0, 20 - ((daysDiff - 90) / 275) * 20)
    return { points, ratio: points / 200, tier: 'DEFAULT', isOnTime: false }
  }
  return { points: 0, ratio: 0.0, tier: 'DEFAULT', isOnTime: false }
}

export function getStreakPointsFromCurve(longestStreak: number, scoredCount: number): number {
  if (scoredCount <= 0 || longestStreak <= 0) return 0
  const cappedStreak = Math.min(6, longestStreak)
  const milestonePts = STREAK_MILESTONES[cappedStreak] ?? 150
  const consistencyRatio = Math.min(1.0, longestStreak / scoredCount)
  return milestonePts * consistencyRatio
}

export function getTenurePointsFromCurve(yearsOfHistory: number): number {
  if (yearsOfHistory <= 0) return 0
  if (yearsOfHistory >= 6) return 50
  const floorYr = Math.floor(yearsOfHistory)
  const frac = yearsOfHistory - floorYr
  const startPts = TENURE_MILESTONES[floorYr] ?? 0
  const endPts = TENURE_MILESTONES[floorYr + 1] ?? 50
  return startPts + frac * (endPts - startPts)
}

export function getScoreBandAndRank(score: number): { band: string; rank: string } {
  if (score >= 800) {
    return { band: 'Elite Tenant', rank: 'A' }
  }
  if (score >= 700) {
    return { band: 'Strong', rank: 'B' }
  }
  if (score >= 600) {
    return { band: 'Good', rank: 'C' }
  }
  if (score >= 500) {
    return { band: 'Fair', rank: 'D' }
  }
  return { band: 'High Risk', rank: 'E' }
}

function getTranchesForCycle(
  cycle: any,
  successfulTransactions: any[],
): { amount: number; paidAt: Date | null }[] {
  const tranches: { amount: number; paidAt: Date | null }[] = []
  const amountOwed = cycle.amountOwed || 0
  if (amountOwed <= 0) return tranches

  const simulatedPaidAt = cycle._simulatePaidOnTime
    ? cycle.paidAt
      ? new Date(cycle.paidAt)
      : new Date()
    : null

  if (cycle.paymentRequestId) {
    const txs = successfulTransactions.filter((t) => t.paymentRequestId === cycle.paymentRequestId)
    if (txs.length > 0) {
      let totalTxAmount = 0
      txs.forEach((tx) => {
        tranches.push({ amount: tx.amount, paidAt: new Date(tx.createdAt) })
        totalTxAmount += tx.amount
      })
      if (totalTxAmount < amountOwed) {
        tranches.push({
          amount: amountOwed - totalTxAmount,
          paidAt: simulatedPaidAt,
        })
      }
    } else if (simulatedPaidAt) {
      tranches.push({ amount: amountOwed, paidAt: simulatedPaidAt })
    } else if (
      cycle.amountPaid > 0 &&
      (cycle.status === 'PAID_ON_TIME' ||
        cycle.status === 'PAID' ||
        cycle.status === 'PAID_LATE' ||
        cycle.status === 'PARTIAL_ON_TIME' ||
        cycle.status === 'PARTIAL_LATE')
    ) {
      tranches.push({
        amount: cycle.amountPaid,
        paidAt: cycle.paidAt ? new Date(cycle.paidAt) : new Date(cycle.updatedAt || cycle.dueDate),
      })
      if (cycle.amountPaid < amountOwed) {
        tranches.push({ amount: amountOwed - cycle.amountPaid, paidAt: null })
      }
    } else {
      tranches.push({ amount: amountOwed, paidAt: null })
    }
  } else {
    if (simulatedPaidAt) {
      tranches.push({ amount: amountOwed, paidAt: simulatedPaidAt })
    } else if (
      cycle.status === 'PAID_ON_TIME' ||
      cycle.status === 'PAID' ||
      cycle.status === 'PAID_LATE' ||
      cycle.status === 'PARTIAL_ON_TIME' ||
      cycle.status === 'PARTIAL_LATE'
    ) {
      const effectivePaid = cycle.amountPaid > 0 ? cycle.amountPaid : amountOwed
      tranches.push({
        amount: effectivePaid,
        paidAt: cycle.paidAt ? new Date(cycle.paidAt) : new Date(cycle.updatedAt || cycle.dueDate),
      })
      if (effectivePaid < amountOwed) {
        tranches.push({ amount: amountOwed - effectivePaid, paidAt: null })
      }
    } else {
      tranches.push({ amount: amountOwed, paidAt: null })
    }
  }
  return tranches
}

@Injectable()
export class CalculateRentScoreUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const rawCycles = await this.rentCycleRepo.findByUserId(user.id!)
    const allCycles = [...rawCycles].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    const now = new Date()

    const userProperties =
      (await this.prisma.upward_user_property?.findMany({
        where: { userId: user.id },
      })) || []

    const verifiedPropertyIds = new Set<number>(
      userProperties.filter((p: any) => p.isVerified).map((p: any) => p.id),
    )
    const propertyById = new Map<number, any>(userProperties.map((p: any) => [p.id, p]))
    const activeProp =
      userProperties.find((p: any) => !p.isPastTenancy) || userProperties[0] || null

    if (allCycles.length === 0) {
      return await this.defaultUnscorableState(user)
    }

    const paymentReqIds = allCycles.map((c) => c.paymentRequestId).filter(Boolean) as number[]
    const successfulTransactions =
      paymentReqIds.length > 0
        ? await this.prisma.upward_transaction.findMany({
            where: {
              paymentRequestId: { in: paymentReqIds },
              status: 'SUCCESS',
            },
          })
        : []

    // Filter out unverified self-reported records until PM/Admin verifies the property
    const isCycleUnverifiedSelfReport = (cycle: any): boolean => {
      const src = (cycle.source as string) || ''
      if (src !== 'SELF_REPORTED') return false
      if (cycle.userPropertyId && verifiedPropertyIds.has(cycle.userPropertyId)) return false
      return true
    }

    const completedCycles = allCycles.filter((cycle) => {
      if (isCycleUnverifiedSelfReport(cycle)) return false
      const dueDate = new Date(cycle.dueDate)
      const status = cycle.status as string
      const isPastDue = dueDate <= now
      const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
      return isPastDue || isFullyPaid
    })

    const pendingCycles = allCycles.filter((cycle) => {
      if (isCycleUnverifiedSelfReport(cycle)) return false
      const dueDate = new Date(cycle.dueDate)
      const status = cycle.status as string
      const isPastDue = dueDate <= now
      const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
      return !isPastDue && !isFullyPaid
    })

    let pendingOwed = 0
    let pendingPaid = 0
    pendingCycles.forEach((cycle) => {
      pendingOwed += cycle.amountOwed || 0
      pendingPaid += cycle.amountPaid || 0
    })

    const evaluation = this.evaluateCyclesDetailed(
      allCycles,
      now,
      successfulTransactions,
      propertyById,
      activeProp,
      verifiedPropertyIds,
    )

    const {
      cycleDetails,
      scoredCycles,
      scoredCount,
      longestStreak,
      currentStreak,
      yearsOfHistory,
      PT,
      D,
      timelinessPoints,
      streakPoints,
      disciplinePoints,
      tenurePoints,
    } = evaluation

    const isScorable = scoredCount > 0 || (pendingCycles.length > 0 && pendingPaid > 0)
    if (!isScorable) {
      return await this.defaultUnscorableState(user, cycleDetails)
    }

    // Savings Bonus Calculation (Up to 100 Points: Rent Vault Primary + Legacy Wallet Fallback)
    const savingsBonus = await this.calculateSavingsBonus(user, activeProp)

    // Base score from completed cycles (or 500 starter if only pending early part-payment exists)
    const baseScore =
      completedCycles.length > 0
        ? this.calculateScoreFromCycles(
            completedCycles,
            now,
            successfulTransactions,
            propertyById,
            activeProp,
            verifiedPropertyIds,
          )
        : 500

    let finalCalculatedCoreScore = baseScore
    if (pendingCycles.length > 0 && pendingPaid > 0 && pendingOwed > 0) {
      const potentialCycles = allCycles.map((cycle) => {
        if (isCycleUnverifiedSelfReport(cycle)) return cycle
        const dueDate = new Date(cycle.dueDate)
        const status = cycle.status as string
        const isPastDue = dueDate <= now
        const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
        if (!isPastDue && !isFullyPaid) {
          return {
            ...cycle,
            status: 'PAID_ON_TIME' as const,
            amountPaid: cycle.amountOwed,
            paidAt: cycle.paidAt || now,
            _simulatePaidOnTime: true,
          }
        }
        return cycle
      })
      const potentialScore = this.calculateScoreFromCycles(
        potentialCycles,
        now,
        successfulTransactions,
        propertyById,
        activeProp,
        verifiedPropertyIds,
      )
      const pendingRatio = Math.min(1, pendingPaid / pendingOwed)
      const scoreDiff = potentialScore - baseScore
      if (scoreDiff > 0) {
        finalCalculatedCoreScore = baseScore + scoreDiff * pendingRatio
      }
    }

    const FinalScore = Math.min(
      900,
      Math.max(300, Math.round(finalCalculatedCoreScore) + savingsBonus),
    )
    const { band, rank } = getScoreBandAndRank(FinalScore)

    // Build chronological Score History Timeline
    const scoreHistory = this.buildScoreHistoryTimeline(
      allCycles,
      now,
      successfulTransactions,
      propertyById,
      activeProp,
      verifiedPropertyIds,
      savingsBonus,
    )

    const onTimeCyclesCount = scoredCycles.filter((c: any) => c.isOnTime).length
    const earlyCyclesCount = scoredCycles.filter(
      (c: any) => c.timelinessTier === 'PAID_EARLY' || c.timelinessTier === 'PAID_SLIGHTLY_EARLY',
    ).length

    return {
      success: true,
      data: {
        isScorable: true,
        score: FinalScore,
        maxScore: 900,
        band,
        rank,
        metrics: {
          ptPercentage: scoredCount > 0 ? (onTimeCyclesCount / scoredCount) * 100 : 0,
          timelinessScorePct: Math.round(PT * 100),
          earlyPaymentCount: earlyCyclesCount,
          longestStreak,
          currentStreak,
          totalCycles: scoredCount,
          historyYears: parseFloat(yearsOfHistory.toFixed(1)),
          discipline: D * 100,
          savingsBonus,
          avgDaysLeadTime: (() => {
            const paidCycles = scoredCycles.filter(
              (c: any) =>
                c.paidDate &&
                (c.status === 'PAID_ON_TIME' ||
                  c.status === 'PAID' ||
                  c.status === 'PAID_LATE' ||
                  c.isOnTime),
            )
            if (paidCycles.length === 0) return 0
            const totalLeadTime = paidCycles.reduce((acc: number, c: any) => {
              return acc - getCalendarDaysDiff(c.paidDate!, c.dueDate)
            }, 0)
            return Math.round(totalLeadTime / paidCycles.length)
          })(),
          breakdown: {
            base: 300,
            timeliness: Math.round(timelinessPoints),
            maxTimeliness: 200,
            streak: Math.round(streakPoints),
            maxStreak: 150,
            discipline: Math.round(disciplinePoints),
            maxDiscipline: 100,
            tenure: Math.round(tenurePoints),
            maxTenure: 50,
            savingsBonus,
            maxSavingsBonus: 100,
          },
        },
        scoreHistory,
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic ? await this.s3Service.getDownloadUrl(user.profilePic) : null,
          profileSlug:
            user.profileSlug ||
            `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
          uuid: user.uuid,
          isIdentityVerified: !!user.isIdentityVerified,
          verificationOn: process.env.VERIFICATION_ON !== 'false',
          profileCompletion: this.calculateProfileCompletion(user),
        },
        properties: user.properties || userProperties || [],
        cycles: cycleDetails,
      },
    }
  }

  private async calculateSavingsBonus(user: any, activeProp: any): Promise<number> {
    // 1. Check active or settled Rent Vault & Rent Savings Score (V2 Primary Source)
    let vaultSavingsBonus = 0
    try {
      const vaults =
        (await (this.prisma as any).upward_rent_vault?.findMany({
          where: {
            userId: user.id,
            lockStatus: { not: 'BROKEN_OUT' },
          },
          include: {
            savingsScore: true,
          },
          orderBy: { createdAt: 'desc' },
        })) || []

      for (const v of vaults) {
        const hasPrincipal = BigInt(v.currentPrincipalKobo || 0) > 0n
        const isSettled = v.lockStatus === 'SETTLED'
        const scoreRec = v.savingsScore
        const hasEarnedPoints =
          scoreRec && ((scoreRec.cadencePoints || 0) > 0 || (scoreRec.velocityPoints || 0) > 0)

        if (hasPrincipal || isSettled || hasEarnedPoints) {
          if (scoreRec && typeof scoreRec.totalScore === 'number') {
            vaultSavingsBonus = Math.max(vaultSavingsBonus, Math.min(100, scoreRec.totalScore))
          } else if (hasPrincipal && BigInt(v.targetAmountKobo || 0) > 0n) {
            const pct = Number((BigInt(v.currentPrincipalKobo) * 100n) / BigInt(v.targetAmountKobo))
            const velocityPts =
              pct >= 100 ? 40 : pct >= 75 ? 30 : pct >= 50 ? 20 : pct >= 25 ? 10 : 5
            vaultSavingsBonus = Math.max(vaultSavingsBonus, velocityPts + 20)
          }
        }
      }
    } catch {
      // Ignore if rent vault tables are not mocked in unit test
    }

    // 2. Legacy Wallet + Savings Goal Fallback
    let expectedAnnualRent = 0
    if (activeProp) {
      expectedAnnualRent =
        activeProp.rentType === 'Monthly' ? activeProp.rentAmount * 12 : activeProp.rentAmount
    }

    const wallet = await this.prisma.upward_wallet?.findUnique({
      where: { userId: user.id },
    })
    const walletBalance = wallet && user.savingsWalletEnabled ? wallet.balance : 0

    const savingsGoals =
      (await this.prisma.upward_savings_goal?.findMany({
        where: { userId: user.id },
      })) || []
    const goalsBalance = savingsGoals.reduce(
      (sum: number, goal: any) => sum + goal.currentAmount,
      0,
    )
    const totalSaved = walletBalance + goalsBalance

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const savingsTx =
      (await this.prisma.upward_wallet_transaction?.findMany({
        where: {
          userId: user.id,
          type: 'WALLET_DEPOSIT',
          status: 'SUCCESS',
          createdAt: { gte: oneYearAgo },
        },
        select: { createdAt: true },
      })) || []

    const uniqueMonths = new Set(
      savingsTx.map((tx: any) => {
        const d = new Date(tx.createdAt)
        return `${d.getFullYear()}-${d.getMonth()}`
      }),
    )
    const monthsSavedCount = uniqueMonths.size

    let legacySavingsScore = 0
    if (expectedAnnualRent > 0) {
      const amountRatio = Math.min(1.0, totalSaved / expectedAnnualRent)
      const consistencyRatio = Math.min(1.0, monthsSavedCount / 12)
      legacySavingsScore = amountRatio * 0.7 + consistencyRatio * 0.3
    }
    const legacySavingsBonus = Math.round(Math.min(1.0, legacySavingsScore) * 100)

    return Math.min(100, Math.max(vaultSavingsBonus, legacySavingsBonus))
  }

  private evaluateCyclesDetailed(
    cyclesToEvaluate: any[],
    now: Date,
    successfulTransactions: any[],
    propertyById: Map<number, any>,
    activeProp: any,
    verifiedPropertyIds: Set<number>,
  ) {
    let totalPTScore = 0
    let partialCyclesCount = 0

    const cycleDetails = cyclesToEvaluate.map((cycle) => {
      const dueDate = new Date(cycle.dueDate)
      const isBeforeDueDate = dueDate > now
      const status = (cycle.status as string) || 'PENDING'
      const source = (cycle.source as string) || 'MANUAL'

      const isUnverifiedSelfReport =
        source === 'SELF_REPORTED' &&
        (!cycle.userPropertyId || !verifiedPropertyIds.has(cycle.userPropertyId))

      const isFullyPaidStatus =
        status === 'PAID_ON_TIME' ||
        status === 'PAID' ||
        status === 'PAID_LATE' ||
        Boolean(cycle._simulatePaidOnTime)

      const isPaidOrPartialStatus =
        isFullyPaidStatus || status === 'PARTIAL_ON_TIME' || status === 'PARTIAL_LATE'

      let excluded = (cycle.amountOwed || 0) <= 0 || isUnverifiedSelfReport
      if (isBeforeDueDate && !isPaidOrPartialStatus) {
        excluded = true
      }

      const tranches = getTranchesForCycle(cycle, successfulTransactions)

      let cyclePT = 0
      let cycleTimelinessTier = 'PENDING' as TimelinessTier
      let paidTranchesTotal = 0
      let allTranchesOnTime = tranches.length > 0
      let earliestPaidDate: Date | null = cycle.paidAt ? new Date(cycle.paidAt) : null

      if (!excluded && tranches.length > 0) {
        let totalWeightedScore = 0
        let totalWeight = 0

        tranches.forEach((tranche) => {
          const w = tranche.amount / cycle.amountOwed
          let trancheScore = 0

          if (tranche.paidAt) {
            paidTranchesTotal += tranche.amount
            if (!earliestPaidDate || tranche.paidAt < earliestPaidDate) {
              earliestPaidDate = tranche.paidAt
            }

            const isLateStatus = status === 'PAID_LATE' || status === 'PARTIAL_LATE'
            let daysDiff = getCalendarDaysDiff(tranche.paidAt, dueDate)

            if (isLateStatus && daysDiff <= 2 && !cycle.paymentRequestId) {
              // Explicitly marked late without granular transaction timestamp
              daysDiff = 15
            } else if (
              !isLateStatus &&
              (status === 'PAID_ON_TIME' || status === 'PARTIAL_ON_TIME') &&
              (source === 'PM_ASSIGNMENT' ||
                source === 'GOODTENANTS_HISTORY' ||
                source === 'PAST_RECORD') &&
              !cycle.paymentRequestId &&
              daysDiff > 2
            ) {
              // Verified on-time historical/PM record where paidAt defaulted to ingestion date
              daysDiff = 0
            }

            const evalResult = evaluateTimelinessFromDaysDiff(daysDiff)
            trancheScore = evalResult.ratio
            cycleTimelinessTier = evalResult.tier
            if (!evalResult.isOnTime) {
              allTranchesOnTime = false
            }
          } else {
            trancheScore = 0.0
            allTranchesOnTime = false
            cycleTimelinessTier = 'DEFAULT'
          }

          totalWeightedScore += trancheScore * w
          totalWeight += w
        })

        cyclePT = totalWeight > 0 ? totalWeightedScore / totalWeight : 0
      }

      const isFullySettledAmount = paidTranchesTotal >= (cycle.amountOwed || 0) * 0.999
      const isLateStatus = status === 'PAID_LATE' || status === 'PARTIAL_LATE'
      const isCycleOnTime =
        !excluded &&
        !isLateStatus &&
        status !== 'MISSED' &&
        isFullySettledAmount &&
        allTranchesOnTime

      if (!excluded) {
        totalPTScore += cyclePT
        // V2 Rule: Early installments settled 100% on or before due date are NOT penalized as partial!
        // Only penalize if an unpaid balance remains or tranches spilled past the due date.
        const isPenalizedPartial =
          !isFullySettledAmount ||
          status === 'PARTIAL_LATE' ||
          status === 'PARTIAL_ON_TIME' ||
          status === 'MISSED' ||
          (tranches.length > 1 && !allTranchesOnTime)

        if (isPenalizedPartial) {
          partialCyclesCount++
        }
      }

      const paidDate = cycle.paidAt ? new Date(cycle.paidAt) : earliestPaidDate

      return {
        id: cycle.id,
        uuid: cycle.uuid,
        userPropertyId: cycle.userPropertyId,
        amount: cycle.amountOwed,
        amountPaid: cycle.amountPaid ?? paidTranchesTotal,
        dueDate,
        paidDate,
        status,
        ptValue: cyclePT,
        timelinessPoints: Math.round(cyclePT * 200),
        timelinessTier: cycleTimelinessTier as TimelinessTier,
        isOnTime: isCycleOnTime,
        isFullySettled: isFullySettledAmount,
        source,
        excluded,
      }
    })

    const scoredCycles = cycleDetails.filter((c) => !c.excluded)
    const scoredCount = scoredCycles.length

    // Streak evaluated strictly over scoredCycles (never penalized by future PENDING invoices)
    let currentStreak = 0
    let longestStreak = 0
    scoredCycles.forEach((cycle) => {
      if (cycle.isOnTime) {
        currentStreak++
        if (currentStreak > longestStreak) longestStreak = currentStreak
      } else {
        currentStreak = 0
      }
    })

    // Tenure Years: strictly based on verified paid cycle lease equivalents
    // (so wall-clock time passing without rent payments never grants free tenure points)
    let paidCyclesEquivalentYears = 0
    scoredCycles.forEach((sc) => {
      if (sc.isFullySettled || sc.status === 'PAID_ON_TIME' || sc.status === 'PAID_LATE') {
        const prop = (sc.userPropertyId && propertyById.get(sc.userPropertyId)) || activeProp
        const rentType = (prop?.rentType || 'Annually').toLowerCase()
        if (rentType === 'monthly') {
          paidCyclesEquivalentYears += 1 / 12
        } else if (rentType === 'quarterly') {
          paidCyclesEquivalentYears += 0.25
        } else if (rentType === 'bi-annually' || rentType === 'semi-annually') {
          paidCyclesEquivalentYears += 0.5
        } else if (rentType === 'weekly' || rentType === 'shortlet') {
          paidCyclesEquivalentYears += 7 / 365
        } else {
          const leaseYears = Math.max(1, Number(prop?.leaseYears) || 1)
          paidCyclesEquivalentYears += leaseYears
        }
      }
    })

    const yearsOfHistory = paidCyclesEquivalentYears

    const PT = scoredCount > 0 ? totalPTScore / scoredCount : 0
    const D = scoredCount > 0 ? 1 - partialCyclesCount / scoredCount : 1

    const timelinessPoints = PT * 200
    const streakPoints = getStreakPointsFromCurve(longestStreak, scoredCount)
    const tenurePoints = getTenurePointsFromCurve(yearsOfHistory)
    const disciplinePoints = D * 100

    const coreScore =
      scoredCount > 0
        ? Math.round(300 + timelinessPoints + streakPoints + tenurePoints + disciplinePoints)
        : 500

    return {
      cycleDetails,
      scoredCycles,
      scoredCount,
      longestStreak,
      currentStreak,
      yearsOfHistory,
      PT,
      D,
      timelinessPoints,
      streakPoints,
      disciplinePoints,
      tenurePoints,
      coreScore,
    }
  }

  private calculateScoreFromCycles(
    cyclesToScore: any[],
    now: Date,
    successfulTransactions: any[],
    propertyById: Map<number, any>,
    activeProp: any,
    verifiedPropertyIds: Set<number>,
  ): number {
    if (cyclesToScore.length === 0) return 500
    const evalResult = this.evaluateCyclesDetailed(
      cyclesToScore,
      now,
      successfulTransactions,
      propertyById,
      activeProp,
      verifiedPropertyIds,
    )
    if (evalResult.scoredCount === 0) return 500
    return evalResult.coreScore
  }

  private buildScoreHistoryTimeline(
    allCycles: any[],
    now: Date,
    successfulTransactions: any[],
    propertyById: Map<number, any>,
    activeProp: any,
    verifiedPropertyIds: Set<number>,
    savingsBonus: number,
  ): ScoreHistoryEvent[] {
    const events: ScoreHistoryEvent[] = []
    let previousScore = 500

    const nonExcludedRaw = allCycles.filter((c) => {
      if ((c.amountOwed || 0) <= 0) return false
      const src = (c.source as string) || ''
      if (
        src === 'SELF_REPORTED' &&
        (!c.userPropertyId || !verifiedPropertyIds.has(c.userPropertyId))
      ) {
        return false
      }
      const dueDate = new Date(c.dueDate)
      const status = (c.status as string) || ''
      const isPaid =
        status === 'PAID_ON_TIME' ||
        status === 'PAID' ||
        status === 'PAID_LATE' ||
        status === 'PARTIAL_ON_TIME' ||
        status === 'PARTIAL_LATE'
      if (dueDate > now && !isPaid) return false
      return true
    })

    for (let i = 0; i < nonExcludedRaw.length; i++) {
      const slice = nonExcludedRaw.slice(0, i + 1)
      const currentCycle = nonExcludedRaw[i]!
      const cycleRefNow =
        currentCycle.paidAt && new Date(currentCycle.paidAt) > new Date(currentCycle.dueDate)
          ? new Date(currentCycle.paidAt)
          : new Date(currentCycle.dueDate) > now
            ? now
            : new Date(currentCycle.dueDate)

      const evalStep = this.evaluateCyclesDetailed(
        slice,
        cycleRefNow,
        successfulTransactions,
        propertyById,
        activeProp,
        verifiedPropertyIds,
      )
      const stepScore = evalStep.coreScore
      const delta = stepScore - previousScore
      previousScore = stepScore

      const detail = evalStep.scoredCycles[evalStep.scoredCycles.length - 1]
      const src = (currentCycle.source as string) || 'MANUAL'
      const isGT = src === 'GOODTENANTS_HISTORY' || src === 'PAST_RECORD'

      let title = 'Rent cycle evaluated'
      let subtitle = `Cycle ${i + 1} • Streak: ${evalStep.longestStreak}`
      let category: ScoreHistoryEvent['category'] = 'RENT_ON_TIME'

      if (isGT) {
        category = 'GOODTENANTS_IMPORT'
        title =
          detail?.timelinessTier === 'PAID_EARLY'
            ? 'Verified Early Rent History (GoodTenants)'
            : 'Verified On-Time Rent History (GoodTenants)'
        subtitle = `Historical Cycle ${i + 1} • Paid ${detail?.timelinessTier === 'PAID_EARLY' ? 'Early (200/200 Timeliness)' : 'On Due Date (185/200 Timeliness)'}`
      } else if (detail?.timelinessTier === 'PAID_EARLY') {
        category = 'RENT_EARLY'
        title = 'Paid Rent Early (7+ Days Ahead)'
        subtitle = `Earned full 200/200 Timeliness (+15 Early-Bird Bonus) • Streak: ${evalStep.longestStreak}`
      } else if (detail?.timelinessTier === 'PAID_SLIGHTLY_EARLY') {
        category = 'RENT_EARLY'
        title = 'Paid Rent Ahead of Due Date'
        subtitle = `Earned 190/200 Timeliness (+5 Early Bonus) • Streak: ${evalStep.longestStreak}`
      } else if (detail?.isOnTime) {
        category = 'RENT_ON_TIME'
        title =
          src === 'RENT_VAULT' ? 'Settled Rent via Upward Rent Vault' : 'Paid Rent On Due Date'
        subtitle = `Earned 185/200 On-Time Timeliness • Streak: ${evalStep.longestStreak}`
      } else {
        category = 'RENT_LATE'
        title = currentCycle.status === 'MISSED' ? 'Missed Rent Due Date' : 'Late Rent Settlement'
        subtitle = `Timeliness & streak adjusted based on delay`
      }

      const eventDate = currentCycle.paidAt
        ? new Date(currentCycle.paidAt).toISOString()
        : new Date(currentCycle.dueDate).toISOString()

      events.push({
        id: `cycle-${currentCycle.uuid || i}`,
        date: eventDate,
        title,
        subtitle,
        delta,
        scoreAfter: stepScore,
        category,
      })
    }

    if (savingsBonus > 0) {
      const finalWithVault = Math.min(900, previousScore + savingsBonus)
      events.push({
        id: 'rent-vault-bonus',
        date: now.toISOString(),
        title: 'Rent Vault & Savings Discipline Bonus',
        subtitle: 'Active deposit cadence, milestone velocity & loan discipline',
        delta: savingsBonus,
        scoreAfter: finalWithVault,
        category: 'RENT_VAULT',
      })
    }

    return events.reverse()
  }

  private calculateProfileCompletion(user: any): number {
    let fields = 0
    const total = 11

    if (user.firstName) fields++
    if (user.lastName) fields++
    if (user.email) fields++
    if (user.dateOfBirth) fields++

    if (user.gender && user.gender !== 'Prefer not to say') fields++

    const firstProp = user.properties?.[0]
    if (firstProp) {
      if (firstProp.rentEndDate) fields++
      if (firstProp.location?.area || firstProp.location?.address) fields++
      if (firstProp.location?.state) fields++
      if (firstProp.location?.country) fields++
      if (firstProp.rentAmount && firstProp.rentAmount > 0) fields++

      const hasManagement = !!(
        firstProp.company?.name ||
        firstProp.companyName ||
        firstProp.manager?.firstName ||
        firstProp.manager?.lastName ||
        firstProp.managerName
      )
      if (hasManagement) fields++
    }

    return Math.round((fields / total) * 100)
  }

  private async defaultUnscorableState(user: any, cycles: any[] = []) {
    return {
      success: true,
      data: {
        isScorable: false,
        score: 500,
        maxScore: 900,
        band: 'Not score-able yet',
        rank: 'N/A',
        metrics: {
          ptPercentage: 0,
          timelinessScorePct: 0,
          earlyPaymentCount: 0,
          longestStreak: 0,
          currentStreak: 0,
          totalCycles: 0,
          historyYears: 0,
          discipline: 0,
          savingsBonus: 0,
          avgDaysLeadTime: 0,
          breakdown: {
            base: 300,
            timeliness: 0,
            maxTimeliness: 200,
            streak: 0,
            maxStreak: 150,
            discipline: 0,
            maxDiscipline: 100,
            tenure: 0,
            maxTenure: 50,
            savingsBonus: 0,
            maxSavingsBonus: 100,
          },
        },
        scoreHistory: [],
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic ? await this.s3Service.getDownloadUrl(user.profilePic) : null,
          profileSlug:
            user.profileSlug ||
            `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
          uuid: user.uuid,
          isIdentityVerified: !!user.isIdentityVerified,
          verificationOn: process.env.VERIFICATION_ON !== 'false',
          profileCompletion: this.calculateProfileCompletion(user),
        },
        properties: user.properties || [],
        cycles,
      },
    }
  }
}
