import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  UNIVERSITY_REFERRAL_REPOSITORY,
  IUniversityReferralRepository,
  UniversityReferralStats,
} from '../../../domains/university-referral/university-referral.repository'
import { UniversityReferral } from '../../../domains/university-referral/university-referral.entity'

@Injectable()
export class GetUniversityReferralStatsUseCase {
  constructor(
    @Inject(UNIVERSITY_REFERRAL_REPOSITORY)
    private readonly referralRepo: IUniversityReferralRepository,
  ) {}

  async execute(): Promise<UniversityReferralStats> {
    return this.referralRepo.getStats()
  }
}

export interface GetUniversityReferralsQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  rewardStatus?: string
}

@Injectable()
export class GetUniversityReferralsAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_REFERRAL_REPOSITORY)
    private readonly referralRepo: IUniversityReferralRepository,
  ) {}

  async execute(query: GetUniversityReferralsQuery): Promise<{
    data: UniversityReferral[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const page = query.page || 1
    const limit = query.limit || 50

    const { data, total } = await this.referralRepo.findAll({
      page,
      limit,
      search: query.search,
      status: query.status,
      rewardStatus: query.rewardStatus,
    })

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }
}

export interface UpdateUniversityReferralAdminCommand {
  id: string
  status?: string
  rewardStatus?: string
  rewardPercentage?: number
  rewardAmount?: number | null
  programFeePaid?: number | null
  paymentRef?: string | null
  notes?: string | null
}

@Injectable()
export class UpdateUniversityReferralAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_REFERRAL_REPOSITORY)
    private readonly referralRepo: IUniversityReferralRepository,
  ) {}

  async execute(command: UpdateUniversityReferralAdminCommand): Promise<UniversityReferral> {
    const existing = await this.referralRepo.findById(command.id)
    if (!existing) {
      throw new NotFoundException(`University referral with ID ${command.id} not found`)
    }

    const current = existing.toObject()
    const newStatus = command.status !== undefined ? command.status : current.status
    const newRewardPercentage = command.rewardPercentage !== undefined ? command.rewardPercentage : current.rewardPercentage
    const newProgramFeePaid = command.programFeePaid !== undefined ? command.programFeePaid : current.programFeePaid
    
    // Auto-calculate rewardAmount if programFeePaid is provided or status is JOINED/PAID
    let calculatedReward = command.rewardAmount !== undefined ? command.rewardAmount : current.rewardAmount
    if (newProgramFeePaid && newProgramFeePaid > 0) {
      calculatedReward = (newProgramFeePaid * (newRewardPercentage || 10)) / 100
    }

    let joinedAt = current.joinedAt
    if ((newStatus === 'JOINED' || newStatus === 'PAID') && !joinedAt) {
      joinedAt = new Date()
    }

    const updated = UniversityReferral.restore({
      ...current,
      status: newStatus,
      rewardStatus: command.rewardStatus !== undefined ? command.rewardStatus : current.rewardStatus,
      rewardPercentage: newRewardPercentage,
      rewardAmount: calculatedReward,
      programFeePaid: newProgramFeePaid,
      paymentRef: command.paymentRef !== undefined ? command.paymentRef : current.paymentRef,
      notes: command.notes !== undefined ? command.notes : current.notes,
      joinedAt,
      updatedAt: new Date(),
    })

    return this.referralRepo.update(updated)
  }
}

@Injectable()
export class DeleteUniversityReferralAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_REFERRAL_REPOSITORY)
    private readonly referralRepo: IUniversityReferralRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    const existing = await this.referralRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`University referral with ID ${id} not found`)
    }
    await this.referralRepo.delete(id)
    return true
  }
}
