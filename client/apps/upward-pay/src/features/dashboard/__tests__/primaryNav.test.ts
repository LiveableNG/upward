import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PRIMARY_NAV_ITEMS, isNavActive, type PrimaryNavItem } from '../navigation/primaryNav'

describe('Primary Navigation Configuration (PRIMARY_NAV_ITEMS)', () => {
  it('contains exactly five primary navigation items in correct order', () => {
    assert.equal(PRIMARY_NAV_ITEMS.length, 5)
    const keys = PRIMARY_NAV_ITEMS.map((item) => item.key)
    assert.deepEqual(keys, ['home', 'goals', 'explore', 'finance', 'profile'])
  })

  it('defines canonical labels and hrefs matching Stage 3C.2 specification', () => {
    const expected = [
      { key: 'home', label: 'Home', href: '/dashboard' },
      { key: 'goals', label: 'My Goals', href: '/dashboard/goals' },
      { key: 'explore', label: 'Explore', href: '/dashboard/explore' },
      { key: 'finance', label: 'Finance', href: '/dashboard/finance' },
      { key: 'profile', label: 'Profile', href: '/dashboard/me' },
    ]

    for (const exp of expected) {
      const item = PRIMARY_NAV_ITEMS.find((it) => it.key === exp.key)
      assert.ok(item, `Item ${exp.key} must exist`)
      assert.equal(item.label, exp.label)
      assert.equal(item.href, exp.href)
      assert.ok(typeof item.icon === 'function' || typeof item.icon === 'object', 'Icon must be a valid component')
    }
  })

  describe('Home Route Matching', () => {
    const home = PRIMARY_NAV_ITEMS.find((it) => it.key === 'home')!

    it('matches /dashboard and trailing slash variants', () => {
      assert.equal(isNavActive(home, '/dashboard'), true)
      assert.equal(isNavActive(home, '/dashboard/'), true)
    })

    it('does not match sub-routes or sibling primary routes', () => {
      assert.equal(isNavActive(home, '/dashboard/goals'), false)
      assert.equal(isNavActive(home, '/dashboard/explore'), false)
      assert.equal(isNavActive(home, '/dashboard/finance'), false)
      assert.equal(isNavActive(home, '/dashboard/me'), false)
      assert.equal(isNavActive(home, '/'), false)
      assert.equal(isNavActive(home, null), false)
    })
  })

  describe('My Goals Route Matching', () => {
    const goals = PRIMARY_NAV_ITEMS.find((it) => it.key === 'goals')!

    it('matches /dashboard/goals and sub-paths', () => {
      assert.equal(isNavActive(goals, '/dashboard/goals'), true)
      assert.equal(isNavActive(goals, '/dashboard/goals/'), true)
      assert.equal(isNavActive(goals, '/dashboard/goals/42'), true)
      assert.equal(isNavActive(goals, '/dashboard/goals/new'), true)
    })

    it('does not match other primary routes', () => {
      assert.equal(isNavActive(goals, '/dashboard'), false)
      assert.equal(isNavActive(goals, '/dashboard/explore'), false)
      assert.equal(isNavActive(goals, '/dashboard/finance'), false)
    })
  })

  describe('Explore Route Matching & Compatibility', () => {
    const explore = PRIMARY_NAV_ITEMS.find((it) => it.key === 'explore')!

    it('matches canonical /dashboard/explore and sub-paths', () => {
      assert.equal(isNavActive(explore, '/dashboard/explore'), true)
      assert.equal(isNavActive(explore, '/dashboard/explore/'), true)
      assert.equal(isNavActive(explore, '/dashboard/explore/catalog'), true)
    })

    it('preserves active compatibility with /dashboard/lifestyle and commerce routes', () => {
      assert.equal(isNavActive(explore, '/dashboard/lifestyle'), true)
      assert.equal(isNavActive(explore, '/dashboard/lifestyle/'), true)
      assert.equal(isNavActive(explore, '/dashboard/lifestyle/offering-123'), true)
      assert.equal(isNavActive(explore, '/dashboard/lifestyle/orders'), true)
      assert.equal(isNavActive(explore, '/dashboard/alliance'), true)
    })

    it('does not match non-explore routes', () => {
      assert.equal(isNavActive(explore, '/dashboard'), false)
      assert.equal(isNavActive(explore, '/dashboard/goals'), false)
      assert.equal(isNavActive(explore, '/dashboard/me'), false)
    })
  })

  describe('Finance Route Matching & Hub Integration', () => {
    const finance = PRIMARY_NAV_ITEMS.find((it) => it.key === 'finance')!

    it('matches canonical /dashboard/finance and sub-paths', () => {
      assert.equal(isNavActive(finance, '/dashboard/finance'), true)
      assert.equal(isNavActive(finance, '/dashboard/finance/'), true)
    })

    it('matches all connected financial and payment tools', () => {
      assert.equal(isNavActive(finance, '/dashboard/pay-rent'), true)
      assert.equal(isNavActive(finance, '/dashboard/savings'), true)
      assert.equal(isNavActive(finance, '/dashboard/transactions'), true)
      assert.equal(isNavActive(finance, '/dashboard/score-breakdown'), true)
      assert.equal(isNavActive(finance, '/dashboard/deposit-balance'), true)
      assert.equal(isNavActive(finance, '/dashboard/rent-support-insurance'), true)
      assert.equal(isNavActive(finance, '/dashboard/receipts'), true)
    })

    it('does not match unrelated routes', () => {
      assert.equal(isNavActive(finance, '/dashboard'), false)
      assert.equal(isNavActive(finance, '/dashboard/goals'), false)
      assert.equal(isNavActive(finance, '/dashboard/me'), false)
    })
  })

  describe('Profile Route Matching', () => {
    const profile = PRIMARY_NAV_ITEMS.find((it) => it.key === 'profile')!

    it('matches canonical /dashboard/me and settings', () => {
      assert.equal(isNavActive(profile, '/dashboard/me'), true)
      assert.equal(isNavActive(profile, '/dashboard/me/'), true)
      assert.equal(isNavActive(profile, '/dashboard/settings'), true)
    })

    it('does not match other primary routes', () => {
      assert.equal(isNavActive(profile, '/dashboard'), false)
      assert.equal(isNavActive(profile, '/dashboard/finance'), false)
    })
  })

  describe('Secondary Tenancy Routes Independence', () => {
    it('/dashboard/my-home does not activate any of the five primary tabs', () => {
      for (const item of PRIMARY_NAV_ITEMS) {
        assert.equal(
          isNavActive(item, '/dashboard/my-home'),
          false,
          `Item ${item.key} should not be active on /dashboard/my-home`,
        )
      }
    })
  })
})
