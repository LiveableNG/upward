import { Inject, Injectable, Optional, BadRequestException, UnauthorizedException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
  UserGoalAction,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { SubmitGoalQuestionnaireDto } from '../dto/user-goal.dto'
import { computeTargetDate } from '../../../domains/goals/timeline.calculator'
import { randomUUID } from 'crypto'

const DEFAULT_SUGGESTED_ACTIONS: Record<string, string[]> = {
  career: [
    'Update my CV and LinkedIn profile',
    'Set a weekly 3-hour learning block',
    'Reach out to a professional mentor or coach',
    'Register for the targeted certification examination',
    'Practice mock questions and review past papers',
  ],
  income: [
    'Map my primary and secondary income sources',
    'Set a dedicated savings target rate',
    'Explore a freelance or side-income opportunity',
    'Conduct a monthly expense review',
    'Talk to someone who has successfully scaled this income path',
  ],
  lifestyle: [
    'Set a realistic budget and milestone checklist',
    'Research verified suppliers and vendor offerings',
    'Block personal time on the calendar for this goal',
    'Share the milestone with an accountability partner',
    'Take the first measurable step this week',
  ],
}

@Injectable()
export class SubmitGoalQuestionnaireUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    dto: SubmitGoalQuestionnaireDto,
  ): Promise<UserGoal> {
    if (!dto.categorySlug || !dto.selectedOption) {
      throw new BadRequestException('categorySlug and selectedOption are required')
    }

    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      if (!this.userRepo) throw new UnauthorizedException('User repository unavailable')
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) throw new UnauthorizedException('User not found')
      resolvedUserId = user.id
    }

    const durationDays = dto.durationDays || 180 // default 6 months
    const targetDate = computeTargetDate(new Date(), durationDays)

    const actionLabels = DEFAULT_SUGGESTED_ACTIONS[dto.categorySlug] || [
      'Set a milestone target date',
      'Track weekly progress',
      'Achieve milestone',
    ]

    const initialActions: UserGoalAction[] = actionLabels.map((label, index) => ({
      id: `act-${randomUUID().slice(0, 8)}`,
      label,
      done: false,
      sortOrder: index,
    }))

    const iconMap: Record<string, string> = {
      career: '📚',
      income: '💼',
      lifestyle: '✈️',
      housing: '🏠',
    }

    const targetAmountKobo = dto.targetAmountKobo
      ? BigInt(dto.targetAmountKobo)
      : null

    return this.goalRepo.createCustomUserGoal(resolvedUserId, {
      title: `${dto.selectedOption}`,
      categorySlug: dto.categorySlug,
      icon: iconMap[dto.categorySlug] || '🎯',
      targetType: targetAmountKobo ? 'AMOUNT' : 'CHECKLIST_ACTIONS',
      durationDays,
      targetDate,
      targetAmountKobo,
      savedAmountKobo: BigInt(0),
      actions: initialActions,
      status: 'ACTIVE',
      notes: `Set via ${dto.questionTitle}: ${dto.selectedOption}`,
    })
  }
}

