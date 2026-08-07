import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

function getBandScore(daysLate: number): number {
  if (daysLate <= 0) return 1.0
  if (daysLate <= 14) return 1.0 - (daysLate * (0.3 / 14))
  if (daysLate <= 30) return 0.7 - ((daysLate - 14) * (0.2 / 16))
  if (daysLate <= 90) return 0.3 - ((daysLate - 30) * (0.2 / 60))
  if (daysLate <= 365) return 0.1 - ((daysLate - 90) * (0.1 / 275))
  return 0.0
}

function getTranchesForCycle(cycle: any, successfulTransactions: any[]): { amount: number; paidAt: Date | null }[] {
  const tranches: { amount: number; paidAt: Date | null }[] = []
  const amountOwed = cycle.amountOwed || 0
  if (amountOwed <= 0) return tranches

  if (cycle.paymentRequestId) {
    const txs = successfulTransactions.filter(t => t.paymentRequestId === cycle.paymentRequestId)
    if (txs.length > 0) {
      let totalTxAmount = 0
      txs.forEach(tx => {
        tranches.push({ amount: tx.amount, paidAt: new Date(tx.createdAt) })
        totalTxAmount += tx.amount
      })
      if (totalTxAmount < amountOwed) {
        tranches.push({ amount: amountOwed - totalTxAmount, paidAt: null })
      }
    } else {
      if (cycle.amountPaid > 0) {
        tranches.push({ amount: cycle.amountPaid, paidAt: cycle.paidAt ? new Date(cycle.paidAt) : new Date(cycle.updatedAt) })
      }
      if (cycle.amountPaid < amountOwed) {
        tranches.push({ amount: amountOwed - cycle.amountPaid, paidAt: null })
      }
    }
  } else {
    if (cycle.amountPaid > 0) {
      tranches.push({ amount: cycle.amountPaid, paidAt: cycle.paidAt ? new Date(cycle.paidAt) : new Date(cycle.updatedAt) })
    }
    if (cycle.amountPaid < amountOwed) {
      tranches.push({ amount: amountOwed - cycle.amountPaid, paidAt: null })
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

    // Fetch all rent cycles for this user
    const rawCycles = await this.rentCycleRepo.findByUserId(user.id!)
    
    // Sort ASC for streak calculation logic
    const allCycles = [...rawCycles].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const now = new Date()

    if (allCycles.length === 0) {
      return await this.defaultUnscorableState(user)
    }

    // Fetch successful transactions to resolve tranches
    const paymentReqIds = allCycles.map(c => c.paymentRequestId).filter(Boolean) as number[]
    const successfulTransactions = paymentReqIds.length > 0
      ? await this.prisma.upward_transaction.findMany({
          where: {
            paymentRequestId: { in: paymentReqIds },
            status: 'SUCCESS'
          }
        })
      : []

    const completedCycles = allCycles.filter(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const status = cycle.status as string
      const isPastDue = dueDate <= now
      const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
      return isPastDue || isFullyPaid
    })

    const pendingCycles = allCycles.filter(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const status = cycle.status as string
      const isPastDue = dueDate <= now
      const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
      return !isPastDue && !isFullyPaid
    })

    let pendingOwed = 0
    let pendingPaid = 0
    pendingCycles.forEach(cycle => {
      pendingOwed += cycle.amountOwed || 0
      pendingPaid += cycle.amountPaid || 0
    })

    let totalPTScore = 0
    let partialCyclesCount = 0

    const cycleDetails = allCycles.map(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const isBeforeDueDate = dueDate > now
      let excluded = (cycle.amountOwed || 0) <= 0
      const status = cycle.status as string

      const tranches = getTranchesForCycle(cycle, successfulTransactions)

      if (isBeforeDueDate && status !== 'PAID_ON_TIME' && status !== 'PAID') {
        excluded = true
      }

      let cyclePT = 0
      if (!excluded && tranches.length > 0) {
        let totalWeightedScore = 0
        let totalWeight = 0
        tranches.forEach(tranche => {
          const w = tranche.amount / cycle.amountOwed
          let trancheScore = 0
          if (tranche.paidAt) {
            const diffTime = tranche.paidAt.getTime() - dueDate.getTime()
            const daysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
            trancheScore = getBandScore(daysLate)
          } else {
            trancheScore = 0.0
          }
          totalWeightedScore += trancheScore * w
          totalWeight += w
        })
        cyclePT = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0
      }

      if (!excluded) {
        totalPTScore += cyclePT
        if (tranches.length > 1 || status === 'PARTIAL_ON_TIME' || status === 'PARTIAL_LATE') {
          partialCyclesCount++
        }
      }

      const paidDate = cycle.paidAt ? new Date(cycle.paidAt) : null
      return {
        id: cycle.id,
        uuid: cycle.uuid,
        amount: cycle.amountOwed,
        dueDate: dueDate,
        paidDate: paidDate,
        status: status,
        ptValue: cyclePT,
        source: (cycle as any).source,
        excluded: excluded
      }
    })

    const scoredCycles = cycleDetails.filter((c: any) => !c.excluded)
    const scoredCount = scoredCycles.length

    // PS = Longest on-time streak ÷ Total rent cycles
    let currentStreak = 0
    let longestStreak = 0
    allCycles.forEach(cycle => {
      const tranches = getTranchesForCycle(cycle, successfulTransactions)
      const isOnTime = tranches.length > 0 && tranches.every(t => t.paidAt && t.paidAt <= new Date(cycle.dueDate))
      if (isOnTime) {
        currentStreak++
        if (currentStreak > longestStreak) longestStreak = currentStreak
      } else {
        currentStreak = 0
      }
    })

    const isScorable = scoredCount > 0 || (pendingCycles.length > 0 && pendingPaid > 0)
    if (!isScorable) {
      return await this.defaultUnscorableState(user)
    }

    // Savings Bonus calculation
    let expectedAnnualRent = 0
    const userProperties = await this.prisma.upward_user_property.findMany({
      where: { userId: user.id, isPastTenancy: false }
    })
    const activeProp = userProperties[0]
    if (activeProp) {
      expectedAnnualRent = activeProp.rentType === 'Monthly'
        ? activeProp.rentAmount * 12
        : activeProp.rentAmount
    }

    const wallet = await this.prisma.upward_wallet.findUnique({
      where: { userId: user.id }
    })
    const walletBalance = (wallet && user.savingsWalletEnabled) ? wallet.balance : 0

    const savingsGoals = await this.prisma.upward_savings_goal.findMany({
      where: { userId: user.id }
    })
    const goalsBalance = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)
    const totalSaved = walletBalance + goalsBalance

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const savingsTx = await this.prisma.upward_wallet_transaction.findMany({
      where: {
        userId: user.id,
        type: 'WALLET_DEPOSIT',
        status: 'SUCCESS',
        createdAt: { gte: oneYearAgo }
      },
      select: { createdAt: true }
    })

    const uniqueMonths = new Set(
      savingsTx.map(tx => {
        const d = new Date(tx.createdAt)
        return `${d.getFullYear()}-${d.getMonth()}`
      })
    )
    const monthsSavedCount = uniqueMonths.size

    let savingsScore = 0
    if (expectedAnnualRent > 0) {
      const amountRatio = Math.min(1.0, totalSaved / expectedAnnualRent)
      const consistencyRatio = Math.min(1.0, monthsSavedCount / 12)
      savingsScore = (amountRatio * 0.7) + (consistencyRatio * 0.3)
    }
    const savingsBonus = Math.round(Math.min(1.0, savingsScore) * 100)

    // Core Metrics
    const PT = scoredCount > 0 ? (totalPTScore / scoredCount) : 0
    const PS = allCycles.length > 0 ? (longestStreak / allCycles.length) : 0

    let yearsOfHistory = 0
    if (allCycles.length > 0) {
      const firstCycleDate = new Date(allCycles[0]!.dueDate)
      const historyMs = now.getTime() - firstCycleDate.getTime()
      yearsOfHistory = Math.max(0, historyMs / (1000 * 60 * 60 * 24 * 365))
    }
    const T = Math.min(1, yearsOfHistory / 3)
    const D = scoredCount > 0 ? (1 - (partialCyclesCount / scoredCount)) : 1

    // Interpolated score calculation
    const baseScore = this.calculateScoreFromCycles(completedCycles, now, successfulTransactions)
    const potentialCycles = allCycles.map(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const status = cycle.status as string
      const isPastDue = dueDate <= now
      const isFullyPaid = status === 'PAID_ON_TIME' || status === 'PAID' || status === 'PAID_LATE'
      if (!isPastDue && !isFullyPaid) {
        return {
          ...cycle,
          status: 'PAID_ON_TIME' as const,
          paidAt: cycle.paidAt || now
        }
      }
      return cycle
    })
    const potentialScore = this.calculateScoreFromCycles(potentialCycles, now, successfulTransactions)
    const pendingRatio = pendingOwed > 0 ? pendingPaid / pendingOwed : 0
    const scoreDiff = potentialScore - baseScore
    const finalCalculatedScore = scoreDiff > 0
      ? baseScore + scoreDiff * pendingRatio
      : baseScore

    const FinalScore = Math.round(finalCalculatedScore) + savingsBonus

    let band = 'High risk'; let rank = 'E'
    if (FinalScore >= 800) { band = 'Elite tenant'; rank = 'A' }
    else if (FinalScore >= 700) { band = 'Strong'; rank = 'B' }
    else if (FinalScore >= 600) { band = 'improving'; rank = 'C' }
    else if (FinalScore >= 500) { band = 'Risky'; rank = 'D' }

    return {
      success: true,
      data: {
        isScorable: true,
        score: FinalScore,
        maxScore: 900,
        band,
        rank,
        metrics: {
          ptPercentage: (scoredCount > 0 ? (scoredCycles.filter((c: any) => c.ptValue === 1.0).length / scoredCount) : 0) * 100,
          longestStreak: longestStreak,
          currentStreak: currentStreak,
          totalCycles: allCycles.length,
          historyYears: parseFloat(yearsOfHistory.toFixed(1)),
          discipline: D * 100,
          savingsBonus: savingsBonus,
          avgDaysLeadTime: (() => {
            const paidCycles = scoredCycles.filter((c: any) => c.paidDate && (c.status === 'PAID_ON_TIME' || c.status === 'PAID_LATE'));
            if (paidCycles.length === 0) return 0;
            const totalLeadTime = paidCycles.reduce((acc, c) => {
              const diff = c.dueDate.getTime() - c.paidDate!.getTime();
              return acc + Math.floor(diff / (1000 * 60 * 60 * 24));
            }, 0);
            return Math.round(totalLeadTime / paidCycles.length);
          })()
        },
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic ? await this.s3Service.getDownloadUrl(user.profilePic) : null,
          profileSlug: user.profileSlug || `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
          uuid: user.uuid,
          isIdentityVerified: !!user.isIdentityVerified,
          verificationOn: process.env.VERIFICATION_ON !== 'false',
          profileCompletion: this.calculateProfileCompletion(user)
        },
        properties: user.properties || [],
        cycles: cycleDetails
      }
    }
  }

  private calculateProfileCompletion(user: any): number {
    let fields = 0
    let total = 11

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

  private async defaultUnscorableState(user: any) {
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
          longestStreak: 0,
          totalCycles: 0,
          historyYears: 0,
          discipline: 0,
          avgDaysLeadTime: 0
        },
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic ? await this.s3Service.getDownloadUrl(user.profilePic) : null,
          profileSlug: user.profileSlug || `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
          uuid: user.uuid,
          isIdentityVerified: !!user.isIdentityVerified,
          verificationOn: process.env.VERIFICATION_ON !== 'false',
          profileCompletion: this.calculateProfileCompletion(user)
        },
        properties: user.properties || [],
        cycles: []
      }
    }
  }

  private calculateScoreFromCycles(cyclesToScore: any[], now: Date, successfulTransactions: any[]): number {
    if (cyclesToScore.length === 0) return 500

    let totalPTScore = 0
    let partialCyclesCount = 0

    const scoredCycles = cyclesToScore.map(cycle => {
      const dueDate = new Date(cycle.dueDate)
      let excluded = (cycle.amountOwed || 0) <= 0
      const status = cycle.status as string

      const tranches = getTranchesForCycle(cycle, successfulTransactions)

      const isBeforeDueDate = dueDate > now
      if (isBeforeDueDate && status !== 'PAID_ON_TIME' && status !== 'PAID') {
        excluded = true
      }

      let cyclePT = 0
      if (!excluded && tranches.length > 0) {
        let totalWeightedScore = 0
        let totalWeight = 0
        tranches.forEach(tranche => {
          const w = tranche.amount / cycle.amountOwed
          let trancheScore = 0
          if (tranche.paidAt) {
            const diffTime = tranche.paidAt.getTime() - dueDate.getTime()
            const daysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
            trancheScore = getBandScore(daysLate)
          } else {
            trancheScore = 0.0
          }
          totalWeightedScore += trancheScore * w
          totalWeight += w
        })
        cyclePT = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0
      }

      if (!excluded) {
        totalPTScore += cyclePT
        if (tranches.length > 1 || status === 'PARTIAL_ON_TIME' || status === 'PARTIAL_LATE') {
          partialCyclesCount++
        }
      }

      return {
        dueDate,
        status,
        ptValue: cyclePT,
        excluded
      }
    }).filter(c => !c.excluded)

    const scoredCount = scoredCycles.length
    if (scoredCount === 0) return 500

    let currentStreak = 0
    let longestStreak = 0
    cyclesToScore.forEach(cycle => {
      const tranches = getTranchesForCycle(cycle, successfulTransactions)
      const isOnTime = tranches.length > 0 && tranches.every(t => t.paidAt && t.paidAt <= new Date(cycle.dueDate))
      if (isOnTime) {
        currentStreak++
        if (currentStreak > longestStreak) longestStreak = currentStreak
      } else {
        currentStreak = 0
      }
    })

    const PT = totalPTScore / scoredCount
    const PS = cyclesToScore.length > 0 ? (longestStreak / cyclesToScore.length) : 0

    let yearsOfHistory = 0
    if (cyclesToScore.length > 0) {
      const firstCycleDate = new Date(cyclesToScore[0]!.dueDate)
      const historyMs = now.getTime() - firstCycleDate.getTime()
      yearsOfHistory = Math.max(0, historyMs / (1000 * 60 * 60 * 24 * 365))
    }
    const T = Math.min(1, yearsOfHistory / 3)
    const D = scoredCount > 0 ? (1 - (partialCyclesCount / scoredCount)) : 1

    const CoreScore = 300 + (PT * 200) + (PS * 150) + (T * 50) + (D * 100)
    return Math.round(CoreScore)
  }
}
