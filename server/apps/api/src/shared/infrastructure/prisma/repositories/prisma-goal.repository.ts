import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Goal,
  GoalCategory,
  GoalCollection,
  GoalOfferingLink,
  GoalPublishStatus,
  GoalRepository,
  UserGoal,
  UserGoalStatus,
} from '../../../../domains/goals/goal.repository'

@Injectable()
export class PrismaGoalRepository implements GoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Categories
  async findCategories(filter?: { status?: GoalPublishStatus; includeGoals?: boolean }): Promise<GoalCategory[]> {
    const where: any = {}
    if (filter?.status) {
      where.status = filter.status
    }

    const categories = await this.prisma.upward_goal_category.findMany({
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

  async findCategoryBySlug(slug: string): Promise<GoalCategory | null> {
    const category = await this.prisma.upward_goal_category.findUnique({
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

  async findCategoryByUuid(uuid: string): Promise<GoalCategory | null> {
    const category = await this.prisma.upward_goal_category.findUnique({
      where: { uuid },
      include: {
        _count: {
          select: { goals: true },
        },
      },
    })
    return (category as GoalCategory) || null
  }

  async createCategory(data: Partial<GoalCategory>): Promise<GoalCategory> {
    const created = await this.prisma.upward_goal_category.create({
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

  async updateCategory(id: number, data: Partial<GoalCategory>): Promise<GoalCategory> {
    const updated = await this.prisma.upward_goal_category.update({
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

  async deleteCategory(id: number): Promise<void> {
    await this.prisma.upward_goal_category.delete({
      where: { id },
    })
  }

  // Goals
  async findGoals(filter?: {
    categoryId?: number
    categorySlug?: string
    status?: GoalPublishStatus
    isFeatured?: boolean
    search?: string
    skip?: number
    take?: number
  }): Promise<{ items: Goal[]; total: number }> {
    const where: any = {}

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
      this.prisma.upward_goal.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        skip: filter?.skip,
        take: filter?.take,
        include: {
          category: true,
          _count: {
            select: { userGoals: true, offerings: true },
          },
        },
      }),
      this.prisma.upward_goal.count({ where }),
    ])

    return { items: items as Goal[], total }
  }

  async findGoalBySlug(slug: string, options?: { includeDetails?: boolean }): Promise<Goal | null> {
    const goal = await this.prisma.upward_goal.findUnique({
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

  async findGoalByUuid(uuid: string): Promise<Goal | null> {
    const goal = await this.prisma.upward_goal.findUnique({
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

  async findGoalById(id: number): Promise<Goal | null> {
    const goal = await this.prisma.upward_goal.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })
    return (goal as Goal) || null
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const created = await this.prisma.upward_goal.create({
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

  async updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
    const updated = await this.prisma.upward_goal.update({
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

  async deleteGoal(id: number): Promise<void> {
    await this.prisma.upward_goal.delete({
      where: { id },
    })
  }

  // User Goals
  async findUserGoals(userId: number, status?: UserGoalStatus): Promise<UserGoal[]> {
    const where: any = { userId }
    if (status) where.status = status

    const userGoals = await this.prisma.upward_user_goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        goal: {
          include: {
            category: true,
            _count: {
              select: { offerings: true },
            },
          },
        },
      },
    })
    return userGoals as UserGoal[]
  }

  async findUserGoal(userId: number, goalId: number): Promise<UserGoal | null> {
    const userGoal = await this.prisma.upward_user_goal.findUnique({
      where: {
        userId_goalId: { userId, goalId },
      },
      include: {
        goal: {
          include: {
            category: true,
          },
        },
      },
    })
    return (userGoal as UserGoal) || null
  }

  async setUserGoals(userId: number, goalIds: number[]): Promise<UserGoal[]> {
    return this.prisma.$transaction(async (tx) => {
      // Find existing goals for this user
      const existing = await tx.upward_user_goal.findMany({
        where: { userId },
        select: { goalId: true },
      })
      const existingGoalIds = new Set(existing.map((e) => e.goalId))

      // Identify goals to add
      const toAdd = goalIds.filter((id) => !existingGoalIds.has(id))

      if (toAdd.length > 0) {
        await tx.upward_user_goal.createMany({
          data: toAdd.map((goalId) => ({
            userId,
            goalId,
            status: 'ACTIVE',
            progressPct: 0,
          })),
        })
      }

      // Return all active user goals
      const all = await tx.upward_user_goal.findMany({
        where: { userId },
        include: {
          goal: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return all as UserGoal[]
    })
  }

  async updateUserGoal(id: number, data: Partial<UserGoal>): Promise<UserGoal> {
    const updated = await this.prisma.upward_user_goal.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.progressPct !== undefined ? { progressPct: data.progressPct } : {}),
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      },
      include: {
        goal: {
          include: { category: true },
        },
      },
    })
    return updated as UserGoal
  }

  async removeUserGoal(userId: number, goalId: number): Promise<void> {
    await this.prisma.upward_user_goal.deleteMany({
      where: { userId, goalId },
    })
  }

  // Collections
  async findCollections(goalId: number, status?: GoalPublishStatus): Promise<GoalCollection[]> {
    const where: any = { goalId }
    if (status) where.status = status

    const collections = await this.prisma.upward_goal_collection.findMany({
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

  async findCollectionByUuid(uuid: string): Promise<GoalCollection | null> {
    const collection = await this.prisma.upward_goal_collection.findUnique({
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

  async createCollection(data: Partial<GoalCollection>): Promise<GoalCollection> {
    const created = await this.prisma.upward_goal_collection.create({
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

  async updateCollection(id: number, data: Partial<GoalCollection>): Promise<GoalCollection> {
    const updated = await this.prisma.upward_goal_collection.update({
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

  async deleteCollection(id: number): Promise<void> {
    await this.prisma.upward_goal_collection.delete({
      where: { id },
    })
  }

  // Goal Offering Links
  async linkOfferingToGoal(data: {
    goalId: number
    offeringId: number
    collectionId?: number | null
    isRecommended?: boolean
    relevanceScore?: number
    curatorNote?: string | null
    sortOrder?: number
  }): Promise<GoalOfferingLink> {
    const link = await this.prisma.upward_goal_offering.upsert({
      where: {
        goalId_offeringId_collectionId: {
          goalId: data.goalId,
          offeringId: data.offeringId,
          collectionId: data.collectionId ?? (null as any),
        },
      },
      create: {
        goalId: data.goalId,
        offeringId: data.offeringId,
        collectionId: data.collectionId,
        isRecommended: data.isRecommended ?? false,
        relevanceScore: data.relevanceScore ?? 100,
        curatorNote: data.curatorNote,
        sortOrder: data.sortOrder ?? 0,
      },
      update: {
        isRecommended: data.isRecommended ?? false,
        relevanceScore: data.relevanceScore ?? 100,
        curatorNote: data.curatorNote,
        sortOrder: data.sortOrder ?? 0,
      },
    })
    return link as GoalOfferingLink
  }

  async unlinkOfferingFromGoal(goalId: number, offeringId: number, collectionId?: number | null): Promise<void> {
    await this.prisma.upward_goal_offering.deleteMany({
      where: {
        goalId,
        offeringId,
        collectionId: collectionId ?? null,
      },
    })
  }

  // Analytics Overview
  async getGoalsOverview(): Promise<{
    totalCategories: number
    totalGoals: number
    totalActiveUserGoals: number
    topGoals: Array<{ goalId: number; title: string; count: number }>
  }> {
    const [totalCategories, totalGoals, totalActiveUserGoals, grouped] = await Promise.all([
      this.prisma.upward_goal_category.count(),
      this.prisma.upward_goal.count(),
      this.prisma.upward_user_goal.count({ where: { status: 'ACTIVE' } }),
      this.prisma.upward_user_goal.groupBy({
        by: ['goalId'],
        _count: { goalId: true },
        where: { status: 'ACTIVE' },
        orderBy: { _count: { goalId: 'desc' } },
        take: 5,
      }),
    ])

    const goalIds = grouped.map((g) => g.goalId)
    const goals = await this.prisma.upward_goal.findMany({
      where: { id: { in: goalIds } },
      select: { id: true, title: true },
    })
    const goalTitleMap = new Map(goals.map((g) => [g.id, g.title]))

    const topGoals = grouped.map((g) => ({
      goalId: g.goalId,
      title: goalTitleMap.get(g.goalId) || 'Unknown Goal',
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

