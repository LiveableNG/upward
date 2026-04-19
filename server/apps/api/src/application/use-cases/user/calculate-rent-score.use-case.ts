import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository, TRANSACTION_REPOSITORY, ITransactionRepository } from '../../../domains/payments/payment.repository'

@Injectable()
export class CalculateRentScoreUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Fetch all payment requests for this user
    const paymentRequests = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PAID')
    const partialRequests = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL')
    
    // Also need pending requests that are past due to count as "Missed"
    const pendingRequests = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING')
    const now = new Date()
    const missedRequests = pendingRequests.filter(pr => new Date(pr.dueDate) < now)

    const allRelevantCycles = [...paymentRequests, ...partialRequests, ...missedRequests]
    
    const userProperties = user.properties || []
    for (const prop of userProperties) {
       // Case 1: Property is currently fully settled in this cycle
       const isFullyPaid = prop.amountRemaining === 0 && (prop.amountPaid || 0) > 0;

       let hasRolledOver = false;
       if (prop.rentEndDate) {
          const startDate = prop.rentStartDate ? new Date(prop.rentStartDate) : new Date(prop.createdAt || new Date())
          const endDate = new Date(prop.rentEndDate)
          const spanDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          hasRolledOver = spanDays > 400 // More than ~13 months = at least one completed cycle
       }

       if (isFullyPaid || hasRolledOver) {
          const hasAnyPR = [...paymentRequests, ...partialRequests, ...pendingRequests]
            .some(pr => pr.userPropertyId === prop.id)
          if (!hasAnyPR) {
             const currentDue = prop.rentEndDate ? new Date(prop.rentEndDate) : new Date()
             const cycleDueDate = new Date(currentDue)
             cycleDueDate.setFullYear(cycleDueDate.getFullYear() - 1)
             allRelevantCycles.push({
                id: -(prop.id || 999), 
                uuid: prop.uuid,
                amount: prop.rentAmount || prop.amountPaid,
                dueDate: cycleDueDate, 
                paidAt: prop.updatedAt || new Date(), 
                status: 'PAID',
                description: 'Manual Settlement'
             } as any)
          }
       }
    }

    for (const prop of userProperties) {
       if (prop.amountRemaining > 0 && prop.rentEndDate && new Date(prop.rentEndDate) < now) {
          const hasAnyPR = [...paymentRequests, ...partialRequests, ...pendingRequests]
            .some(pr => pr.userPropertyId === prop.id)
          if (!hasAnyPR) {
             allRelevantCycles.push({
                id: -(prop.id || 999) - 1000,
                uuid: prop.uuid,
                amount: prop.amountRemaining,
                dueDate: prop.rentEndDate,
                paidAt: null,
                status: 'PENDING',
                description: 'Overdue Rent'
             } as any)
          }
       }
    }

    allRelevantCycles.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )

    const totalCycles = allRelevantCycles.length

    // Condition to be scorable
    const hasSuccessfulPayments = allRelevantCycles.some(c => c.status === 'PAID' || c.status === 'PARTIAL')
    let isScorable = hasSuccessfulPayments

    if (!isScorable) {
      return this.defaultUnscorableState(user)
    }

    let totalPTScore = 0
    let currentStreak = 0
    let longestStreak = 0
    let partialCyclesCount = 0

    const cycleDetails = allRelevantCycles.map(cycle => {
      const dueDate = new Date(cycle.dueDate)
      const isPaidOut = cycle.status === 'PAID' || cycle.status === 'PARTIAL'
      const paidDate = cycle.paidAt ? new Date(cycle.paidAt) : null
      const isBeforeDueDate = dueDate > now

      let ptValue = 0 // default missed

      if (cycle.status === 'PARTIAL' && isBeforeDueDate) {
        return {
          id: cycle.id,
          uuid: cycle.uuid,
          amount: cycle.amount,
          dueDate: dueDate,
          paidDate: paidDate,
          status: cycle.status,
          ptValue: -1, 
          excluded: true
        }
      }

      if (isPaidOut && paidDate) {
        if (paidDate <= dueDate) {
          ptValue = 1.0
          currentStreak++
          if (currentStreak > longestStreak) longestStreak = currentStreak
        } else {
          currentStreak = 0
          
          const diffTime = Math.abs(paidDate.getTime() - dueDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays <= 30) {
            if (diffDays === 1) {
              ptValue = 0.7
            } else if (diffDays === 30) {
              ptValue = 0.5
            } else {
              ptValue = 0.7 - ((diffDays - 1) / 29) * 0.2
            }
          } else {
            ptValue = 0.3 
          }
        }
      } else if (isBeforeDueDate) {
        return {
          id: cycle.id,
          uuid: cycle.uuid,
          amount: cycle.amount,
          dueDate: dueDate,
          paidDate: paidDate,
          status: cycle.status,
          ptValue: -1,
          excluded: true
        }
      } else {
        currentStreak = 0
      }

      totalPTScore += ptValue

      if (cycle.status === 'PARTIAL') {
        if (!isBeforeDueDate) {
          partialCyclesCount++
        }
      }

      return {
        id: cycle.id,
        uuid: cycle.uuid,
        amount: cycle.amount,
        dueDate: dueDate,
        paidDate: paidDate,
        status: cycle.status,
        ptValue: ptValue
      }
    })

    const scoredCycles = cycleDetails.filter((c: any) => !c.excluded)
    const scoredCount = scoredCycles.length

    if (scoredCount === 0) {
      return this.defaultUnscorableState(user)
    }

    // Calculate A: PT
    const PT = scoredCount > 0 ? (totalPTScore / scoredCount) : 0

    // Calculate B: PS (Streak / Total)
    const PS = scoredCount > 0 ? (longestStreak / scoredCount) : 0

    // Calculate C: T (Tenure)
    // Years of history using first successful payment cycle
    let yearsOfHistory = 0
    const successfulCycles = allRelevantCycles.filter(c => c.status === 'PAID' || c.status === 'PARTIAL')
    if (successfulCycles.length > 0) {
      const firstCycleDate = new Date(successfulCycles[0]!.dueDate)
      const historyMs = now.getTime() - firstCycleDate.getTime()
      yearsOfHistory = Math.max(0, historyMs / (1000 * 60 * 60 * 24 * 365))
    }
    const T = Math.min(1, yearsOfHistory / 3)

    // Calculate D: Discipline
    const D = scoredCount > 0 ? (1 - (partialCyclesCount / scoredCount)) : 1

    const CoreScore = 300 + (PT * 200) + (PS * 150) + (T * 50) + (D * 100)
    const SavingsBonus = 0 // Coming soon feature
    const FinalScore = Math.round(CoreScore + SavingsBonus)

    // Band
    let band = 'High risk'
    let rank = 'E'
    if (FinalScore >= 800) { band = 'Elite tenant'; rank = 'A' }
    else if (FinalScore >= 700) { band = 'Strong'; rank = 'B' }
    else if (FinalScore >= 600) { band = 'Improving'; rank = 'C' }
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
          ptPercentage: (scoredCount > 0 ? (scoredCycles.filter((c: any) => c.ptValue === 1).length / scoredCount) : 0) * 100,
          longestStreak: longestStreak,
          totalCycles: totalCycles,
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
