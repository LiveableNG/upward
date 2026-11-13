import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getGoalTitle,
  getCategoryTitle,
  isVendorVerified,
  type UserGoal,
  type Goal,
  type GoalCategory,
  type CommerceVendor,
} from '../types/goals.types'

test('Goal Types & Helpers — getGoalTitle', async (t) => {
  await t.test('prefers customTitle when present on UserGoal', () => {
    const userGoal: UserGoal = {
      id: 1,
      uuid: 'ug-1',
      userId: 42,
      categoryId: 10,
      customTitle: 'Save for 2027 Apartment',
      historicalTitle: 'Housing Fund',
      status: 'ACTIVE',
      progressSource: 'MANUAL_PERCENT',
      progressPct: 45,
      currency: 'NGN',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
      catalogueGoal: {
        id: 5,
        uuid: 'g-5',
        slug: 'rent-home',
        title: 'Rent a New Home',
      },
    }

    assert.strictEqual(getGoalTitle(userGoal), 'Save for 2027 Apartment')
  })

  await t.test('falls back to catalogueGoal title if customTitle is null or empty', () => {
    const userGoal: UserGoal = {
      id: 2,
      uuid: 'ug-2',
      userId: 42,
      categoryId: 10,
      customTitle: null,
      status: 'ACTIVE',
      progressSource: 'STATUS_ONLY',
      progressPct: 0,
      currency: 'NGN',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
      catalogueGoal: {
        id: 5,
        uuid: 'g-5',
        slug: 'emergency-fund',
        title: 'Build Emergency Fund',
      },
    }

    assert.strictEqual(getGoalTitle(userGoal), 'Build Emergency Fund')
  })

  await t.test('resolves title from Goal catalogue object', () => {
    const goal: Goal = {
      id: 5,
      uuid: 'g-5',
      categoryId: 1,
      slug: 'tech-career',
      title: 'Advance in Tech',
      sortOrder: 1,
      status: 'PUBLISHED',
      isFeatured: true,
    }

    assert.strictEqual(getGoalTitle(goal), 'Advance in Tech')
  })

  await t.test('handles null/undefined gracefully', () => {
    assert.strictEqual(getGoalTitle(null), '')
    assert.strictEqual(getGoalTitle(undefined), '')
  })
})

test('Goal Types & Helpers — getCategoryTitle', () => {
  const catWithTitle: GoalCategory = {
    id: 1,
    uuid: 'c-1',
    slug: 'housing',
    title: 'Housing & Relocation',
    sortOrder: 1,
    status: 'PUBLISHED',
  }
  assert.strictEqual(getCategoryTitle(catWithTitle), 'Housing & Relocation')

  const catWithName: GoalCategory = {
    id: 2,
    uuid: 'c-2',
    slug: 'career',
    name: 'Career Acceleration',
    sortOrder: 2,
    status: 'PUBLISHED',
  }
  assert.strictEqual(getCategoryTitle(catWithName), 'Career Acceleration')

  assert.strictEqual(getCategoryTitle(null), '')
  assert.strictEqual(getCategoryTitle(undefined), '')
})

test('Goal Types & Helpers — isVendorVerified', () => {
  const verified: CommerceVendor = {
    id: 1,
    name: 'Reliable Movers',
    slug: 'reliable-movers',
    isVerified: true,
    isActive: true,
  }
  assert.strictEqual(isVendorVerified(verified), true)

  const unverified: CommerceVendor = {
    id: 2,
    name: 'Unverified Shop',
    slug: 'unverified-shop',
    isVerified: false,
    isActive: true,
  }
  assert.strictEqual(isVendorVerified(unverified), false)

  assert.strictEqual(isVendorVerified(null), false)
})
