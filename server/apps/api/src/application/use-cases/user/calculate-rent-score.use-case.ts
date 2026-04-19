import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository'

@Injectable()
export class CalculateRentScoreUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Fetch all rent cycles for this user - sorted by dueDate
    const allCycles = await this.rentCycleRepo.findByUserId(user.id!)
    const now = new Date()

    if (allCycles.length === 0) {
      return this.defaultUnscorableState(user)
    }

    let totalPTScore = 0
    let currentStreak = 0
    let longestStreak = 0
    let partialCyclesCount = 0

    const cycleDetails = allCycles.map(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const paidDate = cycle.paidAt ? new Date(cycle.paidAt) : null
      const isBeforeDueDate = dueDate > now

      let ptValue = 0 // default for MISSED or PENDING past due
      let excluded = false
      let status = cycle.status

      if (status === 'PAID_ON_TIME') {
        ptValue = 1.0
        currentStreak++
        if (currentStreak > longestStreak) longestStreak = currentStreak
      } else if (status === 'PAID_LATE' && paidDate) {
        currentStreak = 0
        const diffTime = Math.abs(paidDate.getTime() - dueDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 14) {
          ptValue = 0.85
        } else if (diffDays <= 30) {
          ptValue = 0.7 - ((diffDays - 14) / 16) * 0.2
        } else {
          ptValue = 0.3
        }
      } else if (status === 'PARTIAL_ON_TIME' || status === 'PARTIAL_LATE') {
        if (isBeforeDueDate) {
          excluded = true
          ptValue = -1
        } else {
          currentStreak = 0
          ptValue = 0.5 
          partialCyclesCount++
        }
      } else if (status === 'MISSED') {
        currentStreak = 0
        ptValue = 0
      } else if (status === 'PENDING') {
        if (isBeforeDueDate) {
          excluded = true
          ptValue = -1
        } else {
          currentStreak = 0
          ptValue = 0 // effectively missed if past due
        }
      }

      if (!excluded) {
        totalPTScore += ptValue
      }

      return {
        id: cycle.id,
        uuid: cycle.uuid,
        amount: cycle.amountOwed,
        dueDate: dueDate,
        paidDate: paidDate,
        status: cycle.status,
        ptValue: ptValue,
        source: (cycle as any).source,
        excluded: excluded
      }
    })

    const scoredCycles = cycleDetails.filter((c: any) => !c.excluded)
    const scoredCount = scoredCycles.length

    if (scoredCount === 0) {
      return this.defaultUnscorableState(user)
    }

    // Calculate A: PT
    const PT = scoredCount > 0 ? (totalPTScore / scoredCount) : 0

    // Calculate B: PS (Streak / Total Scored)
    const PS = scoredCount > 0 ? (longestStreak / scoredCount) : 0

    // Calculate C: T (Tenure) - Years of history using first scorable cycle
    let yearsOfHistory = 0
    if (allCycles.length > 0) {
      const firstCycleDate = new Date(allCycles[0]!.dueDate)
      const historyMs = now.getTime() - firstCycleDate.getTime()
      yearsOfHistory = Math.max(0, historyMs / (1000 * 60 * 60 * 24 * 365))
    }
    const T = Math.min(1, yearsOfHistory / 3)

    // Calculate D: Discipline
    const D = scoredCount > 0 ? (1 - (partialCyclesCount / scoredCount)) : 1

    const CoreScore = 300 + (PT * 200) + (PS * 150) + (T * 50) + (D * 100)
    const SavingsBonus = 0
    const FinalScore = Math.round(CoreScore + SavingsBonus)

    // Band/Rank
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
          ptPercentage: (scoredCount > 0 ? (scoredCycles.filter((c: any) => c.ptValue >= 0.85).length / scoredCount) : 0) * 100,
          longestStreak: longestStreak,
          totalCycles: allCycles.length,
          historyYears: parseFloat(yearsOfHistory.toFixed(1)),
          discipline: D * 100
        },
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic,
          profileSlug: user.profileSlug || `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
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

    // 1-6: Basic details (User Repo decodes these)
    if (user.firstName) fields++
    if (user.lastName) fields++
    if (user.email) fields++
    if (user.dateOfBirth) fields++
    
    // 7: Gender
    if (user.gender && user.gender !== 'Prefer not to say') fields++

    // 8-13: Property Details (from the first property)
    const firstProp = user.properties?.[0]
    if (firstProp) {
      // 8: Rent Date
      if (firstProp.rentEndDate) fields++
      
      // 9: Location Area/Street
      if (firstProp.location?.area || firstProp.location?.address) fields++
      
      // 10: State
      if (firstProp.location?.state) fields++
      
      // 11: Country
      if (firstProp.location?.country) fields++

      // 12: Rent Amount
      if (firstProp.rentAmount && firstProp.rentAmount > 0) fields++
      
      // 13: Management Info (Company or Manager)
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

  private defaultUnscorableState(user: any) {
    return {
      success: true,
      data: {
        isScorable: false,
        score: 500, // Defaul Faded Score
        maxScore: 900,
        band: 'Not score-able yet',
        rank: 'N/A',
        metrics: {
          ptPercentage: 0,
          longestStreak: 0,
          totalCycles: 0,
          historyYears: 0,
          discipline: 0
        },
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          profilePic: user.profilePic,
          profileSlug: user.profileSlug || `${user.firstName}-${user.lastName}-${user.uuid.split('-')[0]}`.toLowerCase(),
          profileCompletion: this.calculateProfileCompletion(user)
        },
        properties: user.properties || [],
        cycles: []
      }
    }
  }
}
