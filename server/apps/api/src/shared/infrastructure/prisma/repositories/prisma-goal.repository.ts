import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import {
  Goal,
  GoalCategory,
  GoalCollection,
  GoalInterest,
  GoalInterestHistory,
  GoalInterestStatus,
  GoalMilestone,
  GoalOfferingLink,
  GoalPublishStatus,
  GoalRepository,
  HousingAdoptionDecision,
  HousingAdoptionStatus,
  UserGoal,
  UserGoalStatus,
} from '../../../../domains/goals/goal.repository'

@Injectable()
export class PrismaGoalRepository implements GoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): Prisma.TransactionClient | PrismaService {
    if (tx) {
      return tx as Prisma.TransactionClient
    }
    return this.prisma
  }

  private async executeInTx<T>(
    tx: unknown | undefined,
    fn: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) {
      return fn(tx as Prisma.TransactionClient)
    }
    return this.prisma.$transaction(async (innerTx) => fn(innerTx))
  }

  private toDomainUserGoal(record: any): UserGoal {
    if (!record) return null as any
    return {
      id: record.id,
      uuid: record.uuid,
      userId: record.userId,
      goalId: record.goalId,
      categoryId: record.categoryId,
      historicalTitle: record.historicalTitle,
      customTitle: record.customTitle,
      customDescription: record.customDescription,
      status: record.status,
      progressSource: record.progressSource,
      progressPct: record.progressPct,
      targetDate: record.targetDate,
      notes: record.notes,
      currentAmountMinor: record.currentAmountMinor,
      targetAmountMinor: record.targetAmountMinor,
      currency: record.currency,
      completedAt: record.completedAt,
      archivedAt: record.archivedAt,
      pausedAt: record.pausedAt,
      lastVerifiedBalanceMinor: record.lastVerifiedBalanceMinor,
      verifiedSourceUuid: record.verifiedSourceUuid,
      verifiedAt: record.verifiedAt,
      userPropertyId: record.userPropertyId,
      rentVaultId: record.rentVaultId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      goal: record.catalogueGoal ?? record.goal ?? undefined,
      catalogueGoal: record.catalogueGoal ?? undefined,
      category: record.category ?? undefined,
      milestones: record.milestones ?? undefined,
      interests: record.interests
        ? record.interests.map((i: any) => this.toDomainInterest(i))
        : undefined,
    }
  }

  private toDomainInterest(record: any): GoalInterest {
    if (!record) return null as any
    return {
      id: record.id,
      uuid: record.uuid,
      userGoalId: record.userGoalId,
      serviceType: record.serviceType,
      status: record.status,
      notes: record.notes,
      adminNotes: record.adminNotes,
      version: record.version,
      submittedAt: record.submittedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      history: record.history ? record.history.map((h: any) => this.toDomainInterestHistory(h)) : undefined,
    }
  }

  private toDomainInterestHistory(record: any): GoalInterestHistory {
    if (!record) return null as any
    return {
      id: record.id,
      uuid: record.uuid,
      interestId: record.interestId,
      version: record.version,
      serviceType: record.serviceType,
      status: record.status,
      notes: record.notes,
      adminNotes: record.adminNotes,
      snapshotAt: record.snapshotAt,
    }
  }

  // Categories
  async findCategories(
    filter?: { status?: GoalPublishStatus; includeGoals?: boolean },
    tx?: unknown,
  ): Promise<GoalCategory[]> {
    const client = this.getClient(tx)
    const where: Prisma.upward_goal_categoryWhereInput = {}
    if (filter?.status) {
      where.status = filter.status
    }

    const categories = await client.upward_goal_category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { goals: true },
        },
        ...(filter?.includeGoals
          ? {
              goals: {
                where: filter.status ? { status: filter.status } : undefined,
                orderBy: { sortOrder: 'asc' },
              },
            }
          : {}),
      },
    })

    return categories as GoalCategory[]
  }

  async findCategoryBySlug(slug: string, tx?: unknown): Promise<GoalCategory | null> {
    const client = this.getClient(tx)
    const category = await client.upward_goal_category.findUnique({
      where: { slug },
      include: {
        goals: {
          where: { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { goals: true },
        },
      },
    })
    return (category as GoalCategory) || null
  }

  async findCategoryByUuid(uuid: string, tx?: unknown): Promise<GoalCategory | null> {
    const client = this.getClient(tx)
    const category = await client.upward_goal_category.findUnique({
      where: { uuid },
      include: {
        _count: {
          select: { goals: true },
        },
      },
    })
    return (category as GoalCategory) || null
  }

  async createCategory(data: Partial<GoalCategory>, tx?: unknown): Promise<GoalCategory> {
    const client = this.getClient(tx)
    const created = await client.upward_goal_category.create({
      data: {
        slug: data.slug!,
        title: data.title!,
        description: data.description,
        iconName: data.iconName || 'Target',
        coverImage: data.coverImage,
        sortOrder: data.sortOrder ?? 0,
        status: data.status ?? 'DRAFT',
      },
    })
    return created as GoalCategory
  }

  async updateCategory(id: number, data: Partial<GoalCategory>, tx?: unknown): Promise<GoalCategory> {
    const client = this.getClient(tx)
    const updated = await client.upward_goal_category.update({
      where: { id },
      data: {
        ...(data.slug ? { slug: data.slug } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.iconName ? { iconName: data.iconName } : {}),
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    })
    return updated as GoalCategory
  }

  async deleteCategory(id: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_goal_category.delete({
      where: { id },
    })
  }

  // Goals
  async findGoals(
    filter?: {
      categoryId?: number
      categorySlug?: string
      status?: GoalPublishStatus
      isFeatured?: boolean
      search?: string
      skip?: number
      take?: number
    },
    tx?: unknown,
  ): Promise<{ items: Goal[]; total: number }> {
    const client = this.getClient(tx)
    const where: Prisma.upward_goalWhereInput = {}

    if (filter?.categoryId) where.categoryId = filter.categoryId
    if (filter?.categorySlug) where.category = { slug: filter.categorySlug }
    if (filter?.status) where.status = filter.status
    if (filter?.isFeatured !== undefined) where.isFeatured = filter.isFeatured
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { tagline: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      client.upward_goal.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        skip: filter?.skip,
        take: filter?.take,
        include: {
          category: true,
          offerings: {
            include: {
              offering: {
                include: { media: true, vendor: true },
              },
              collection: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { userGoals: true, offerings: true },
          },
        },
      }),
      client.upward_goal.count({ where }),
    ])

    return { items: items as Goal[], total }
  }

  async findGoalBySlug(
    slug: string,
    options?: { includeDetails?: boolean },
    tx?: unknown,
  ): Promise<Goal | null> {
    const client = this.getClient(tx)
    const goal = await client.upward_goal.findUnique({
      where: { slug },
      include: {
        category: true,
        ...(options?.includeDetails
          ? {
              collections: {
                where: { status: 'PUBLISHED' },
                orderBy: { sortOrder: 'asc' },
                include: {
                  offerings: {
                    include: {
                      offering: {
                        include: {
                          media: { orderBy: { sortOrder: 'asc' } },
                          vendor: true,
                        },
                      },
                    },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
              offerings: {
                where: { offering: { status: 'PUBLISHED' } },
                include: {
                  offering: {
                    include: {
                      media: { orderBy: { sortOrder: 'asc' } },
                      vendor: true,
                    },
                  },
                },
                orderBy: [{ isRecommended: 'desc' }, { sortOrder: 'asc' }],
              },
              _count: {
                select: { userGoals: true, offerings: true },
              },
            }
          : {}),
      },
    })
    return (goal as Goal) || null
  }

  async findGoalByUuid(uuid: string, tx?: unknown): Promise<Goal | null> {
    const client = this.getClient(tx)
    const goal = await client.upward_goal.findUnique({
      where: { uuid },
      include: {
        category: true,
        collections: true,
        _count: {
          select: { userGoals: true, offerings: true },
        },
      },
    })
    return (goal as Goal) || null
  }

  async findGoalById(id: number, tx?: unknown): Promise<Goal | null> {
    const client = this.getClient(tx)
    const goal = await client.upward_goal.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })
    return (goal as Goal) || null
  }

  async createGoal(data: Partial<Goal>, tx?: unknown): Promise<Goal> {
    const client = this.getClient(tx)
    const created = await client.upward_goal.create({
      data: {
        categoryId: data.categoryId!,
        slug: data.slug!,
        title: data.title!,
        tagline: data.tagline,
        description: data.description,
        iconName: data.iconName,
        heroImage: data.heroImage,
        sortOrder: data.sortOrder ?? 0,
        status: data.status ?? 'DRAFT',
        isFeatured: data.isFeatured ?? false,
      },
      include: {
        category: true,
      },
    })
    return created as Goal
  }

  async updateGoal(id: number, data: Partial<Goal>, tx?: unknown): Promise<Goal> {
    const client = this.getClient(tx)
    const updated = await client.upward_goal.update({
      where: { id },
      data: {
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.slug ? { slug: data.slug } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.iconName !== undefined ? { iconName: data.iconName } : {}),
        ...(data.heroImage !== undefined ? { heroImage: data.heroImage } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      },
      include: {
        category: true,
      },
    })
    return updated as Goal
  }

  async deleteGoal(id: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_goal.delete({
      where: { id },
    })
  }

  // User Goals
  async findUserGoals(userId: number, status?: UserGoalStatus, tx?: unknown): Promise<UserGoal[]> {
    const client = this.getClient(tx)
    const where: Prisma.upward_user_goalWhereInput = { userId }
    if (status) {
      where.status = status
    }

    const userGoals = await client.upward_user_goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        catalogueGoal: {
          include: {
            category: true,
            _count: {
              select: { offerings: true },
            },
          },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        interests: {
          include: {
            history: {
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    })
    return userGoals.map((ug) => this.toDomainUserGoal(ug))
  }

  async findUserGoal(userId: number, goalId: number, tx?: unknown): Promise<UserGoal | null> {
    const client = this.getClient(tx)
    const userGoal = await client.upward_user_goal.findFirst({
      where: {
        userId,
        goalId,
        status: { not: 'ARCHIVED' },
      },
      include: {
        catalogueGoal: {
          include: {
            category: true,
          },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        interests: {
          include: {
            history: {
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    })
    return userGoal ? this.toDomainUserGoal(userGoal) : null
  }

  async findUserGoalById(id: number, tx?: unknown): Promise<UserGoal | null> {
    const client = this.getClient(tx)
    const userGoal = await client.upward_user_goal.findUnique({
      where: { id },
      include: {
        catalogueGoal: {
          include: {
            category: true,
          },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        interests: {
          include: {
            history: {
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    })
    return userGoal ? this.toDomainUserGoal(userGoal) : null
  }

  async findUserGoalByUuid(uuid: string, tx?: unknown): Promise<UserGoal | null> {
    const client = this.getClient(tx)
    const userGoal = await client.upward_user_goal.findUnique({
      where: { uuid },
      include: {
        catalogueGoal: {
          include: {
            category: true,
          },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        interests: {
          include: {
            history: {
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    })
    return userGoal ? this.toDomainUserGoal(userGoal) : null
  }

  async createUserGoal(data: Partial<UserGoal>, tx?: unknown): Promise<UserGoal> {
    return this.executeInTx(tx, async (client) => {
      let historicalTitle = data.historicalTitle
      let categoryId = data.categoryId
      let customTitle = data.customTitle ? data.customTitle.trim() : null
      let customDescription = data.customDescription ?? null

      if (data.goalId) {
        // Catalogue-backed goal
        const catalogGoal = await client.upward_goal.findUnique({
          where: { id: data.goalId },
        })
        if (!catalogGoal) {
          throw new NotFoundException(`Catalogue goal with ID ${data.goalId} not found`)
        }
        historicalTitle = catalogGoal.title
        categoryId = catalogGoal.categoryId
        customTitle = null
        customDescription = null
      } else {
        // Custom goal
        if (!customTitle || customTitle.length === 0) {
          throw new BadRequestException('customTitle is required for custom goals')
        }
        if (!categoryId) {
          throw new BadRequestException('categoryId is required for custom goals')
        }
        historicalTitle = customTitle
      }

      const createInput: Prisma.upward_user_goalUncheckedCreateInput = {
        userId: data.userId!,
        goalId: data.goalId ?? null,
        categoryId: categoryId!,
        historicalTitle: historicalTitle!,
        customTitle,
        customDescription,
        status: data.status ?? 'ACTIVE',
        progressSource: data.progressSource ?? 'MANUAL_PERCENT',
        progressPct: data.progressPct ?? 0,
        targetDate: data.targetDate,
        notes: data.notes,
        currentAmountMinor: data.currentAmountMinor,
        targetAmountMinor: data.targetAmountMinor,
        currency: data.currency ?? 'NGN',
        userPropertyId: data.userPropertyId,
        rentVaultId: data.rentVaultId,
      }

      const created = await client.upward_user_goal.create({
        data: createInput,
        include: {
          catalogueGoal: {
            include: { category: true },
          },
          category: true,
          milestones: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      return this.toDomainUserGoal(created)
    })
  }

  async setUserGoals(userId: number, goalIds: number[], tx?: unknown): Promise<UserGoal[]> {
    const targetSet = new Set(goalIds)

    return this.executeInTx(tx, async (client) => {
      // Find existing catalogue goals for this user (never touch custom goals where goalId is null)
      const existing = await client.upward_user_goal.findMany({
        where: {
          userId,
          goalId: { not: null },
        },
      })

      // 1. Soft-archive deselected catalogue goals (preserve progress & milestones, do not delete)
      const toArchive = existing.filter(
        (e) => e.goalId !== null && !targetSet.has(e.goalId) && e.status !== 'ARCHIVED',
      )
      for (const eg of toArchive) {
        await client.upward_user_goal.update({
          where: { id: eg.id },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
          },
        })
      }

      // 2. Reactivate previously archived goals that are now re-selected
      const toReactivate = existing.filter(
        (e) => e.goalId !== null && targetSet.has(e.goalId) && e.status === 'ARCHIVED',
      )
      for (const eg of toReactivate) {
        await client.upward_user_goal.update({
          where: { id: eg.id },
          data: {
            status: 'ACTIVE',
            archivedAt: null,
          },
        })
      }

      // 3. Create newly selected goals
      const existingGoalIds = new Set(existing.map((e) => e.goalId!))
      const toAdd = goalIds.filter((id) => !existingGoalIds.has(id))

      if (toAdd.length > 0) {
        const catalogGoals = await client.upward_goal.findMany({
          where: { id: { in: toAdd } },
        })
        const catalogGoalMap = new Map(catalogGoals.map((g) => [g.id, g]))

        for (const goalId of toAdd) {
          const catalogGoal = catalogGoalMap.get(goalId)
          if (catalogGoal) {
            await client.upward_user_goal.create({
              data: {
                userId,
                goalId,
                categoryId: catalogGoal.categoryId,
                historicalTitle: catalogGoal.title,
                customTitle: null,
                customDescription: null,
                status: 'ACTIVE',
                progressSource: 'MANUAL_PERCENT',
                progressPct: 0,
                currency: 'NGN',
              },
            })
          }
        }
      }

      // Return all active user goals for this user (both active catalogue and custom goals)
      const activeGoals = await client.upward_user_goal.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          catalogueGoal: {
            include: { category: true },
          },
          category: true,
          milestones: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return activeGoals.map((g) => this.toDomainUserGoal(g))
    })
  }

  async updateUserGoal(id: number, data: Partial<UserGoal>, tx?: unknown): Promise<UserGoal> {
    const client = this.getClient(tx)
    const updateInput: Prisma.upward_user_goalUncheckedUpdateInput = {
      ...(data.status ? { status: data.status } : {}),
      ...(data.customTitle !== undefined ? { customTitle: data.customTitle } : {}),
      ...(data.customDescription !== undefined ? { customDescription: data.customDescription } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.progressPct !== undefined ? { progressPct: data.progressPct } : {}),
      ...(data.progressSource ? { progressSource: data.progressSource } : {}),
      ...(data.currentAmountMinor !== undefined ? { currentAmountMinor: data.currentAmountMinor } : {}),
      ...(data.targetAmountMinor !== undefined ? { targetAmountMinor: data.targetAmountMinor } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      ...(data.archivedAt !== undefined ? { archivedAt: data.archivedAt } : {}),
      ...(data.pausedAt !== undefined ? { pausedAt: data.pausedAt } : {}),
      ...(data.lastVerifiedBalanceMinor !== undefined
        ? { lastVerifiedBalanceMinor: data.lastVerifiedBalanceMinor }
        : {}),
      ...(data.verifiedSourceUuid !== undefined ? { verifiedSourceUuid: data.verifiedSourceUuid } : {}),
      ...(data.verifiedAt !== undefined ? { verifiedAt: data.verifiedAt } : {}),
      ...(data.userPropertyId !== undefined ? { userPropertyId: data.userPropertyId } : {}),
      ...(data.rentVaultId !== undefined ? { rentVaultId: data.rentVaultId } : {}),
    }

    const updated = await client.upward_user_goal.update({
      where: { id },
      data: updateInput,
      include: {
        catalogueGoal: {
          include: { category: true },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    return this.toDomainUserGoal(updated)
  }

  async removeUserGoal(userId: number, goalId: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_user_goal.updateMany({
      where: {
        userId,
        goalId,
        status: { not: 'ARCHIVED' },
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    })
  }

  async archiveUserGoal(id: number, tx?: unknown): Promise<UserGoal> {
    const client = this.getClient(tx)
    const updated = await client.upward_user_goal.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
      include: {
        catalogueGoal: {
          include: { category: true },
        },
        category: true,
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    return this.toDomainUserGoal(updated)
  }

  // Milestones
  async findMilestones(userGoalId: number, tx?: unknown): Promise<GoalMilestone[]> {
    const client = this.getClient(tx)
    const milestones = await client.upward_goal_milestone.findMany({
      where: { userGoalId },
      orderBy: { sortOrder: 'asc' },
    })
    return milestones as GoalMilestone[]
  }

  async findMilestoneById(id: number, tx?: unknown): Promise<GoalMilestone | null> {
    const client = this.getClient(tx)
    const milestone = await client.upward_goal_milestone.findUnique({
      where: { id },
    })
    return (milestone as GoalMilestone) || null
  }

  async createMilestone(data: Partial<GoalMilestone>, tx?: unknown): Promise<GoalMilestone> {
    const client = this.getClient(tx)
    const created = await client.upward_goal_milestone.create({
      data: {
        userGoalId: data.userGoalId!,
        title: data.title!,
        status: data.status ?? 'PENDING',
        sortOrder: data.sortOrder ?? 0,
        targetDate: data.targetDate,
        completedAt: data.completedAt,
      },
    })
    return created as GoalMilestone
  }

  async updateMilestone(
    id: number,
    data: Partial<GoalMilestone>,
    tx?: unknown,
  ): Promise<GoalMilestone> {
    const client = this.getClient(tx)
    const updated = await client.upward_goal_milestone.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      },
    })
    return updated as GoalMilestone
  }

  async deleteMilestone(id: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_goal_milestone.delete({
      where: { id },
    })
  }

  // Housing Adoption Decisions
  async findHousingAdoptionDecisions(
    userId: number,
    status?: HousingAdoptionStatus,
    tx?: unknown,
  ): Promise<HousingAdoptionDecision[]> {
    const client = this.getClient(tx)
    const where: Prisma.upward_housing_adoption_decisionWhereInput = { userId }
    if (status) {
      where.status = status
    }
    const decisions = await client.upward_housing_adoption_decision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userGoal: true,
      },
    })
    return decisions.map((d) => ({
      id: d.id,
      uuid: d.uuid,
      userId: d.userId,
      userPropertyId: d.userPropertyId,
      rentVaultId: d.rentVaultId,
      userGoalId: d.userGoalId,
      status: d.status as HousingAdoptionStatus,
      decidedAt: d.decidedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      userGoal: d.userGoal ? this.toDomainUserGoal(d.userGoal) : null,
    }))
  }

  async findHousingAdoptionDecisionById(
    id: number,
    tx?: unknown,
  ): Promise<HousingAdoptionDecision | null> {
    const client = this.getClient(tx)
    const decision = await client.upward_housing_adoption_decision.findUnique({
      where: { id },
      include: {
        userGoal: true,
      },
    })
    if (!decision) return null
    return {
      id: decision.id,
      uuid: decision.uuid,
      userId: decision.userId,
      userPropertyId: decision.userPropertyId,
      rentVaultId: decision.rentVaultId,
      userGoalId: decision.userGoalId,
      status: decision.status as HousingAdoptionStatus,
      decidedAt: decision.decidedAt,
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt,
      userGoal: decision.userGoal ? this.toDomainUserGoal(decision.userGoal) : null,
    }
  }

  async createHousingAdoptionDecision(
    data: Partial<HousingAdoptionDecision>,
    tx?: unknown,
  ): Promise<HousingAdoptionDecision> {
    const client = this.getClient(tx)
    const created = await client.upward_housing_adoption_decision.create({
      data: {
        userId: data.userId!,
        userPropertyId: data.userPropertyId ?? null,
        rentVaultId: data.rentVaultId ?? null,
        userGoalId: data.userGoalId ?? null,
        status: data.status ?? 'PENDING',
        decidedAt: data.decidedAt ?? null,
      },
      include: {
        userGoal: true,
      },
    })
    return {
      id: created.id,
      uuid: created.uuid,
      userId: created.userId,
      userPropertyId: created.userPropertyId,
      rentVaultId: created.rentVaultId,
      userGoalId: created.userGoalId,
      status: created.status as HousingAdoptionStatus,
      decidedAt: created.decidedAt,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      userGoal: created.userGoal ? this.toDomainUserGoal(created.userGoal) : null,
    }
  }

  async updateHousingAdoptionDecision(
    id: number,
    data: Partial<HousingAdoptionDecision>,
    tx?: unknown,
  ): Promise<HousingAdoptionDecision> {
    const client = this.getClient(tx)
    const updated = await client.upward_housing_adoption_decision.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.userGoalId !== undefined ? { userGoalId: data.userGoalId } : {}),
        ...(data.decidedAt !== undefined ? { decidedAt: data.decidedAt } : {}),
      },
      include: {
        userGoal: true,
      },
    })
    return {
      id: updated.id,
      uuid: updated.uuid,
      userId: updated.userId,
      userPropertyId: updated.userPropertyId,
      rentVaultId: updated.rentVaultId,
      userGoalId: updated.userGoalId,
      status: updated.status as HousingAdoptionStatus,
      decidedAt: updated.decidedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      userGoal: updated.userGoal ? this.toDomainUserGoal(updated.userGoal) : null,
    }
  }

  // Interests
  async findInterests(userGoalId: number, tx?: unknown): Promise<GoalInterest[]> {
    const client = this.getClient(tx)
    const items = await client.upward_goal_interest.findMany({
      where: { userGoalId },
      include: {
        history: {
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })
    return items.map((i) => this.toDomainInterest(i))
  }

  async findInterestById(id: number, tx?: unknown): Promise<GoalInterest | null> {
    const client = this.getClient(tx)
    const item = await client.upward_goal_interest.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { version: 'desc' },
        },
      },
    })
    return item ? this.toDomainInterest(item) : null
  }

  async createInterest(data: Partial<GoalInterest>, tx?: unknown): Promise<GoalInterest> {
    return this.executeInTx(tx, async (client) => {
      const created = await client.upward_goal_interest.create({
        data: {
          userGoalId: data.userGoalId!,
          serviceType: data.serviceType || 'GENERAL_INQUIRY',
          status: (data.status as GoalInterestStatus) || 'SUBMITTED',
          notes: data.notes ?? null,
          adminNotes: data.adminNotes ?? null,
          version: 1,
        },
        include: {
          history: true,
        },
      })
      return this.toDomainInterest(created)
    })
  }

  async updateInterest(
    id: number,
    expectedVersion: number,
    data: Partial<GoalInterest>,
    adminNotes?: string | null,
    tx?: unknown,
  ): Promise<GoalInterest> {
    return this.executeInTx(tx, async (client) => {
      // 1. Fetch current record
      const current = await client.upward_goal_interest.findUnique({
        where: { id },
      })
      if (!current) {
        throw new NotFoundException(`Goal interest with ID ${id} not found`)
      }
      if (current.version !== expectedVersion) {
        throw new ConflictException(
          `Optimistic lock failure: Interest version mismatch (expected ${expectedVersion}, current ${current.version})`,
        )
      }

      const nextVersion = current.version + 1
      const newStatus = (data.status as GoalInterestStatus) || current.status
      const effectiveAdminNotes = adminNotes !== undefined ? adminNotes : (data.adminNotes ?? current.adminNotes)
      const effectiveNotes = data.notes !== undefined ? data.notes : current.notes

      // 2. Conditionally update with compare-and-swap on version
      const updateResult = await client.upward_goal_interest.updateMany({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          status: newStatus,
          notes: effectiveNotes,
          adminNotes: effectiveAdminNotes,
          version: nextVersion,
        },
      })

      if (updateResult.count === 0) {
        throw new ConflictException(
          `Optimistic lock failure: Interest was modified by another concurrent transaction`,
        )
      }

      // 3. Insert history record in the same transaction
      await client.upward_goal_interest_history.create({
        data: {
          interestId: id,
          version: nextVersion,
          serviceType: current.serviceType,
          status: newStatus,
          notes: effectiveNotes,
          adminNotes: effectiveAdminNotes,
        },
      })

      // 4. Return updated record with full history
      const result = await client.upward_goal_interest.findUnique({
        where: { id },
        include: {
          history: {
            orderBy: { version: 'desc' },
          },
        },
      })
      return this.toDomainInterest(result!)
    })
  }

  async findInterestHistory(interestId: number, tx?: unknown): Promise<GoalInterestHistory[]> {
    const client = this.getClient(tx)
    const items = await client.upward_goal_interest_history.findMany({
      where: { interestId },
      orderBy: { version: 'desc' },
    })
    return items.map((i) => this.toDomainInterestHistory(i))
  }

  // Collections
  async findCollections(
    goalId: number,
    status?: GoalPublishStatus,
    tx?: unknown,
  ): Promise<GoalCollection[]> {
    const client = this.getClient(tx)
    const where: Prisma.upward_goal_collectionWhereInput = { goalId }
    if (status) where.status = status

    const collections = await client.upward_goal_collection.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { offerings: true },
        },
      },
    })
    return collections as GoalCollection[]
  }

  async findCollectionByUuid(uuid: string, tx?: unknown): Promise<GoalCollection | null> {
    const client = this.getClient(tx)
    const collection = await client.upward_goal_collection.findUnique({
      where: { uuid },
      include: {
        offerings: {
          include: {
            offering: {
              include: {
                media: true,
                vendor: true,
              },
            },
          },
        },
      },
    })
    return (collection as GoalCollection) || null
  }

  async createCollection(data: Partial<GoalCollection>, tx?: unknown): Promise<GoalCollection> {
    const client = this.getClient(tx)
    const created = await client.upward_goal_collection.create({
      data: {
        goalId: data.goalId!,
        title: data.title!,
        subtitle: data.subtitle,
        description: data.description,
        badge: data.badge,
        sortOrder: data.sortOrder ?? 0,
        status: data.status ?? 'DRAFT',
      },
    })
    return created as GoalCollection
  }

  async updateCollection(
    id: number,
    data: Partial<GoalCollection>,
    tx?: unknown,
  ): Promise<GoalCollection> {
    const client = this.getClient(tx)
    const updated = await client.upward_goal_collection.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.badge !== undefined ? { badge: data.badge } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    })
    return updated as GoalCollection
  }

  async deleteCollection(id: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_goal_collection.delete({
      where: { id },
    })
  }

  // Goal Offering Links
  async linkOfferingToGoal(
    data: {
      goalId: number
      offeringId: number
      collectionId?: number | null
      isRecommended?: boolean
      relevanceScore?: number
      curatorNote?: string | null
      sortOrder?: number
    },
    tx?: unknown,
  ): Promise<GoalOfferingLink> {
    const client = this.getClient(tx)
    const existing = await client.upward_goal_offering.findFirst({
      where: {
        goalId: data.goalId,
        offeringId: data.offeringId,
        collectionId: data.collectionId ?? null,
      },
    })

    if (existing) {
      const updated = await client.upward_goal_offering.update({
        where: { id: existing.id },
        data: {
          isRecommended: data.isRecommended ?? false,
          relevanceScore: data.relevanceScore ?? 100,
          curatorNote: data.curatorNote,
          sortOrder: data.sortOrder ?? 0,
        },
      })
      return updated as GoalOfferingLink
    }

    const created = await client.upward_goal_offering.create({
      data: {
        goalId: data.goalId,
        offeringId: data.offeringId,
        collectionId: data.collectionId ?? null,
        isRecommended: data.isRecommended ?? false,
        relevanceScore: data.relevanceScore ?? 100,
        curatorNote: data.curatorNote,
        sortOrder: data.sortOrder ?? 0,
      },
    })
    return created as GoalOfferingLink
  }

  async unlinkOfferingFromGoal(
    goalId: number,
    offeringId: number,
    collectionId?: number | null,
    tx?: unknown,
  ): Promise<void> {
    const client = this.getClient(tx)
    await client.upward_goal_offering.deleteMany({
      where: {
        goalId,
        offeringId,
        ...(collectionId !== undefined ? { collectionId } : {}),
      },
    })
  }

  // Analytics Overview
  async getGoalsOverview(tx?: unknown): Promise<{
    totalCategories: number
    totalGoals: number
    totalActiveUserGoals: number
    topGoals: Array<{ goalId: number; title: string; count: number }>
  }> {
    const client = this.getClient(tx)
    const [totalCategories, totalGoals, totalActiveUserGoals, grouped] = await Promise.all([
      client.upward_goal_category.count(),
      client.upward_goal.count(),
      client.upward_user_goal.count({ where: { status: 'ACTIVE' } }),
      client.upward_user_goal.groupBy({
        by: ['goalId'],
        _count: { goalId: true },
        where: { status: 'ACTIVE', goalId: { not: null } },
        orderBy: { _count: { goalId: 'desc' } },
        take: 5,
      }),
    ])

    const goalIds = grouped.map((g) => g.goalId!).filter(Boolean)
    const goals = await client.upward_goal.findMany({
      where: { id: { in: goalIds } },
      select: { id: true, title: true },
    })
    const goalTitleMap = new Map(goals.map((g) => [g.id, g.title]))

    const topGoals = grouped
      .filter((g) => g.goalId !== null)
      .map((g) => ({
        goalId: g.goalId!,
        title: goalTitleMap.get(g.goalId!) || 'Unknown Goal',
        count: g._count.goalId,
      }))

    return {
      totalCategories,
      totalGoals,
      totalActiveUserGoals,
      topGoals,
    }
  }
}
