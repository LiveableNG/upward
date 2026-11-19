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
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { TriggerAutomatedRewardUseCase } from '../../rewards/use-cases/trigger-automated-reward.use-case'

const DEFAULT_SUGGESTED_ACTIONS: Record<string, string[]> = {
  housing: [
    'Review upcoming rent due date and amount',
    'Set up automated monthly housing deposit',
    'Track progress and verify payment receipt',
  ],
  income: [
    'Map my primary and secondary income sources',
    'Set a dedicated savings target rate',
    'Explore a freelance or side-income opportunity',
    'Conduct a monthly expense review',
    'Talk to someone who has successfully scaled this income path',
  ],
  career: [
    'Update my CV and LinkedIn profile',
    'Set a weekly 3-hour learning block',
    'Reach out to a professional mentor or coach',
    'Register for the targeted certification examination',
    'Practice mock questions and review past papers',
  ],
  'pay-less': [
    'Review current monthly expense across this item',
    'Opt into Upward bulk partner pricing or group cart',
    'Track monthly savings and reinvest difference',
  ],
  children: [
    'Select curriculum, coaching program, or club',
    'Set aside weekly practice or tutoring time',
    'Track termly milestone achievements',
  ],
  fitness: [
    'Set a weekly workout and movement schedule',
    'Book a first fitness or gym session',
    'Track nutrition and daily hydration for 7 days',
    'Find a workout partner or accountability group',
    'Schedule a routine health check-up',
  ],
  lifestyle: [
    'Set a realistic budget and milestone checklist',
    'Research verified suppliers and vendor offerings',
    'Block personal time on the calendar for this goal',
    'Share the milestone with an accountability partner',
    'Take the first measurable step this week',
  ],
  custom: [
    'Define milestone target date and target outcome',
    'List top 3 execution steps to complete',
    'Track weekly progress towards completion',
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
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    private readonly triggerRewardUseCase?: TriggerAutomatedRewardUseCase,
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

    let actionLabels: string[] = []
    if (this.prisma) {
      const matchedGoal = await this.prisma.upward_goal.findFirst({
        where: {
          title: { equals: dto.selectedOption, mode: 'insensitive' },
          category: { slug: dto.categorySlug },
        },
        include: {
          actionTemplates: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      if (matchedGoal?.actionTemplates && matchedGoal.actionTemplates.length > 0) {
        actionLabels = matchedGoal.actionTemplates.map((t) => t.title)
      }
    }

    if (actionLabels.length === 0) {
      actionLabels = DEFAULT_SUGGESTED_ACTIONS[dto.categorySlug] || [
        'Set a milestone target date',
        'Track weekly progress',
        'Achieve milestone',
      ]
    }

    const initialActions: UserGoalAction[] = actionLabels.map((label, index) => ({
      id: `act-${randomUUID().slice(0, 8)}`,
      label,
      done: false,
      sortOrder: index,
    }))

    const iconMap: Record<string, string> = {
      fitness: '💪',
      career: '💼',
      income: '💰',
      lifestyle: '✨',
      housing: '🏠',
      children: '🎓',
      'pay-less': '🏷️',
      custom: '🎯',
    }

    const targetAmountKobo = dto.targetAmountKobo
      ? BigInt(dto.targetAmountKobo)
      : null

    const createdGoal = await this.goalRepo.createCustomUserGoal(resolvedUserId, {
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

    if (this.triggerRewardUseCase) {
      const slug = dto.categorySlug.toLowerCase()
      const triggerKey =
        slug === 'income'
          ? 'FORM_INCOME_INFO'
          : slug === 'career'
            ? 'FORM_CAREER_GOALS'
            : 'FORM_FINANCIAL_GOALS'

      const customReason =
        slug === 'income'
          ? 'Completed income information form'
          : slug === 'career'
            ? 'Completed career goals form'
            : `Completed ${dto.categorySlug} financial goals form`

      await this.triggerRewardUseCase
        .execute({
          userId: resolvedUserId,
          triggerKey,
          customReason,
        })
        .catch(() => {})
    }

    return createdGoal
  }
}

