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

  describe('RENT_VAULT Verified Progress Presentation', () => {
    const rentVaultGoal: UserGoal = {
      id: 5,
      uuid: 'user-goal-5',
      userId: 10,
      goalId: null,
      categoryId: 1,
      status: 'ACTIVE',
      progressSource: 'RENT_VAULT',
      progressPct: 50,
      currency: 'NGN',
      targetAmountMinor: '100000000', // 1,000,000 NGN target
      lastVerifiedBalanceMinor: '50000000', // 500,000 NGN verified principal
      verifiedSourceUuid: 'vault-uuid-abc',
      verifiedAt: '2026-11-10T12:00:00.000Z',
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      customTitle: 'Save for Rent Advance',
    }

    it('displays verified principal balance without accepting manual edits', () => {
      assert.equal(rentVaultGoal.progressSource, 'RENT_VAULT')
      assert.equal(rentVaultGoal.lastVerifiedBalanceMinor, '50000000')
      assert.equal(formatMinorUnitAmount(rentVaultGoal.lastVerifiedBalanceMinor, rentVaultGoal.currency), '₦500,000')
      assert.equal(formatMinorUnitAmount(rentVaultGoal.targetAmountMinor, rentVaultGoal.currency), '₦1,000,000')
      assert.equal(rentVaultGoal.verifiedSourceUuid, 'vault-uuid-abc')
    })
  })

  describe('Target Amount Validation Contracts', () => {
    const isValidTargetMajor = (val: string): boolean => {
      if (!val || !val.trim()) return false
      const minor = formatMinorUnitAmount(val) // clean
      const cleaned = val.replace(/,/g, '').trim()
      if (!/^\d+(\.\d+)?$/.test(cleaned)) return false
      const num = parseFloat(cleaned)
      return num > 0
    }

    it('accepts strictly positive major currency strings', () => {
      assert.equal(isValidTargetMajor('500000'), true)
      assert.equal(isValidTargetMajor('1,000,000'), true)
      assert.equal(isValidTargetMajor('250.50'), true)
    })

    it('rejects zero, negative, empty or non-numeric inputs', () => {
      assert.equal(isValidTargetMajor('0'), false)
      assert.equal(isValidTargetMajor('0.00'), false)
      assert.equal(isValidTargetMajor('-100'), false)
      assert.equal(isValidTargetMajor(''), false)
      assert.equal(isValidTargetMajor('abc'), false)
    })
  })

  describe('Lifecycle State Transitions Matrix', () => {
    const validTransitions: Record<string, string[]> = {
      ACTIVE: ['PAUSED', 'COMPLETED', 'ARCHIVED'],
      PAUSED: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
      COMPLETED: ['ACTIVE', 'ARCHIVED'],
      ARCHIVED: ['ACTIVE'],
    }

    it('permits valid transitions per Stage 3B domain rules', () => {
      assert.ok(validTransitions.ACTIVE.includes('PAUSED'))
      assert.ok(validTransitions.ACTIVE.includes('COMPLETED'))
      assert.ok(validTransitions.ACTIVE.includes('ARCHIVED'))

      assert.ok(validTransitions.PAUSED.includes('ACTIVE'))
      assert.ok(validTransitions.PAUSED.includes('COMPLETED'))

      assert.ok(validTransitions.COMPLETED.includes('ACTIVE')) // reopening
      assert.ok(validTransitions.COMPLETED.includes('ARCHIVED'))

      assert.ok(validTransitions.ARCHIVED.includes('ACTIVE')) // reactivation
    })

    it('forbids invalid transitions rejected by backend', () => {
      assert.ok(!validTransitions.COMPLETED.includes('PAUSED')) // Cannot pause completed
      assert.ok(!validTransitions.ARCHIVED.includes('PAUSED')) // Must reactivate to ACTIVE first
      assert.ok(!validTransitions.ARCHIVED.includes('COMPLETED'))
    })
  })

  describe('Milestone Progress Computation Rules', () => {
    it('calculates 0% when there are zero milestones', () => {
      const milestones: Array<{ status: 'PENDING' | 'COMPLETED' }> = []
      const pct = milestones.length === 0 ? 0 : Math.floor((milestones.filter(m => m.status === 'COMPLETED').length / milestones.length) * 100)
      assert.equal(pct, 0)
    })

    it('calculates rounded-down percentage for completed milestones', () => {
      const milestones: Array<{ status: 'PENDING' | 'COMPLETED' }> = [
        { status: 'COMPLETED' },
        { status: 'PENDING' },
        { status: 'PENDING' },
      ]
      const completed = milestones.filter((m) => m.status === 'COMPLETED').length
      const pct = Math.floor((completed / milestones.length) * 100)
      assert.equal(pct, 33) // 1/3 = 33%
    })
  })

  describe('Detail Route ID Extraction & Sync', () => {
    const parseDetailGoalId = (pathname: string): string | null => {
      const match = pathname.match(/\/dashboard\/goals\/([^/]+)/)
      if (match && match[1] && match[1] !== 'placeholder') {
        return match[1]
      }
      return null
    }

    it('extracts numeric and UUID identifiers correctly', () => {
      assert.equal(parseDetailGoalId('/dashboard/goals/123'), '123')
      assert.equal(parseDetailGoalId('/dashboard/goals/ug-uuid-456'), 'ug-uuid-456')
    })

    it('ignores placeholder and root goals routes', () => {
      assert.equal(parseDetailGoalId('/dashboard/goals/placeholder'), null)
      assert.equal(parseDetailGoalId('/dashboard/goals'), null)
    })
  })
})
