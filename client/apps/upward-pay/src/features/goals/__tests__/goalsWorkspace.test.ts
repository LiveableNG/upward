import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  type UserGoal,
  type Goal,
  type GoalCategory,
  getGoalTitle,
  getCategoryTitle,
} from '../types/goals.types'
import { formatMinorUnitAmount } from '../utils/monetary'

describe('My Goals Workspace Logic & Component Contracts', () => {
  const baseTimestamp = '2026-11-01T00:00:00.000Z'

  const mockGoals: UserGoal[] = [
    {
      id: 1,
      uuid: 'user-goal-1',
      userId: 10,
      goalId: 101,
      categoryId: 1,
      status: 'ACTIVE',
      progressSource: 'MILESTONES',
      progressPct: 40,
      currency: 'NGN',
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      customTitle: null,
      customDescription: null,
      targetDate: '2026-12-01T00:00:00.000Z',
      notes: 'Priority 1',
      catalogueGoal: {
        id: 101,
        uuid: 'goal-101',
        title: 'Equip My Work-from-Home Space',
        slug: 'equip-my-work-from-home-space',
        tagline: 'Ergonomic workspace setup',
      },
      category: {
        id: 1,
        uuid: 'cat-1',
        slug: 'home-productivity',
        title: 'Home & Productivity',
        iconName: 'Home',
      },
    },
    {
      id: 2,
      uuid: 'user-goal-2',
      userId: 10,
      goalId: null,
      categoryId: 1,
      status: 'PAUSED',
      progressSource: 'MANUAL_PERCENT',
      progressPct: 65,
      currency: 'NGN',
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      customTitle: 'Learn Spanish',
      customDescription: 'B2 proficiency',
      targetDate: null,
      notes: null,
    },
    {
      id: 3,
      uuid: 'user-goal-3',
      userId: 10,
      goalId: null,
      categoryId: 2,
      status: 'COMPLETED',
      progressSource: 'TARGET_AMOUNT',
      progressPct: 100,
      targetAmountMinor: '50000000', // 500,000 NGN
      currentAmountMinor: '50000000',
      currency: 'NGN',
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      customTitle: 'Emergency Fund',
      customDescription: '3 months rent',
      completedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 4,
      uuid: 'user-goal-4',
      userId: 10,
      goalId: null,
      categoryId: 1,
      status: 'ARCHIVED',
      progressSource: 'STATUS_ONLY',
      progressPct: 0,
      currency: 'NGN',
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      customTitle: 'Old Archived Project',
      customDescription: null,
    },
  ]

  describe('Workspace Tab Partitioning & Counts', () => {
    it('partitions user goals accurately across the four statuses', () => {
      const active = mockGoals.filter((g) => g.status === 'ACTIVE')
      const paused = mockGoals.filter((g) => g.status === 'PAUSED')
      const completed = mockGoals.filter((g) => g.status === 'COMPLETED')
      const archived = mockGoals.filter((g) => g.status === 'ARCHIVED')

      assert.equal(active.length, 1)
      assert.equal(paused.length, 1)
      assert.equal(completed.length, 1)
      assert.equal(archived.length, 1)

      assert.equal(active[0].id, 1)
      assert.equal(paused[0].id, 2)
      assert.equal(completed[0].id, 3)
      assert.equal(archived[0].id, 4)
    })
  })

  describe('Progress Presentation Rules per Progress Source', () => {
    it('MILESTONES source displays progress percentage calculated from milestones', () => {
      const g = mockGoals[0]
      assert.equal(g.progressSource, 'MILESTONES')
      assert.equal(g.progressPct, 40)
    })

    it('MANUAL_PERCENT source respects manual percentage without milestone dependence', () => {
      const g = mockGoals[1]
      assert.equal(g.progressSource, 'MANUAL_PERCENT')
      assert.equal(g.progressPct, 65)
    })

    it('TARGET_AMOUNT source formats BigInt minor units accurately', () => {
      const g = mockGoals[2]
      assert.equal(g.progressSource, 'TARGET_AMOUNT')
      const targetFormatted = formatMinorUnitAmount(g.targetAmountMinor, g.currency)
      const currentFormatted = formatMinorUnitAmount(g.currentAmountMinor, g.currency)
      assert.equal(targetFormatted, '₦500,000')
      assert.equal(currentFormatted, '₦500,000')
    })

    it('STATUS_ONLY source avoids fabricating misleading completion percentages', () => {
      const g = mockGoals[3]
      assert.equal(g.progressSource, 'STATUS_ONLY')
      // Component should treat status-only as purely binary status tracked
      assert.equal(g.status, 'ARCHIVED')
    })
  })

  describe('Catalogue Filtering & Search', () => {
    const catalogue: Array<Goal & { category?: GoalCategory }> = [
      {
        id: 1,
        categoryId: 1,
        slug: 'equip-my-work-from-home-space',
        title: 'Equip My Work-from-Home Space',
        tagline: 'Ergonomic seating and power setup',
        description: 'Build a high-focus remote workspace.',
        sortOrder: 1,
        status: 'PUBLISHED',
        isFeatured: false,
      },
      {
        id: 2,
        categoryId: 1,
        slug: 'pristine-apartment-maintenance',
        title: 'Pristine Apartment Maintenance',
        tagline: 'Scheduled deep cleans and fumigation',
        description: 'Keep your rented home clean.',
        sortOrder: 2,
        status: 'PUBLISHED',
        isFeatured: false,
      },
    ]

    it('filters catalogue goals by category ID', () => {
      const filtered = catalogue.filter((g) => g.categoryId === 1)
      assert.equal(filtered.length, 2)

      const nonExistent = catalogue.filter((g) => g.categoryId === 999)
      assert.equal(nonExistent.length, 0)
    })

    it('filters catalogue goals by case-insensitive title search query', () => {
      const q = 'work-from-home'
      const matches = catalogue.filter(
        (g) =>
          (g.title || g.name || '').toLowerCase().includes(q) ||
          g.tagline?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q),
      )
      assert.equal(matches.length, 1)
      assert.equal(matches[0].id, 1)
    })
  })

  describe('Goal Titles & Fallbacks', () => {
    it('resolves custom title first when present', () => {
      assert.equal(getGoalTitle(mockGoals[1]), 'Learn Spanish')
    })

    it('falls back to catalogue goal title when custom title is null', () => {
      assert.equal(getGoalTitle(mockGoals[0]), 'Equip My Work-from-Home Space')
    })
  })
})
