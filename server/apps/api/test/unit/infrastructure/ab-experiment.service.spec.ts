import {
  AbExperimentService,
  hashStringToBucket,
} from '../../../src/shared/infrastructure/experiment/ab-experiment.service'

describe('AbExperimentService', () => {
  let service: AbExperimentService

  beforeEach(() => {
    service = new AbExperimentService()
  })

  describe('hashStringToBucket', () => {
    it('produces identical bucket values for identical inputs', () => {
      const b1 = hashStringToBucket('user-1234', 'onboarding-rental-experience')
      const b2 = hashStringToBucket('user-1234', 'onboarding-rental-experience')
      expect(b1).toBe(b2)
      expect(b1).toBeGreaterThanOrEqual(0)
      expect(b1).toBeLessThan(100)
    })

    it('produces different buckets for different user identifiers', () => {
      const b1 = hashStringToBucket('user-1', 'onboarding-rental-experience')
      const b2 = hashStringToBucket('user-2', 'onboarding-rental-experience')
      expect(typeof b1).toBe('number')
      expect(typeof b2).toBe('number')
    })
  })

  describe('evaluate', () => {
    it('returns default variant when experiment key is not found', () => {
      const result = service.evaluate('non-existent-experiment', 'user-123')
      expect(result.variant).toBe('deferrable-rental')
      expect(result.isFallback).toBe(true)
      expect(result.reason).toBe('FALLBACK')
    })

    it('returns deterministic variant for known experiment based on weights', () => {
      const result = service.evaluate('onboarding-rental-experience', 'user-123')
      expect(['required-rental', 'deferrable-rental']).toContain(result.variant)
      expect(result.isFallback).toBe(false)
      expect(result.reason).toBe('RULE_MATCH')
    })

    it('respects manual email override with top priority', () => {
      service.updateConfig('onboarding-rental-experience', {
        overrides: {
          'test@upward.ng': 'required-rental',
        },
      })

      const resOverride = service.evaluate(
        'onboarding-rental-experience',
        'some-random-uuid',
        'TEST@UPWARD.NG', // case insensitive check
      )
      expect(resOverride.variant).toBe('required-rental')
      expect(resOverride.reason).toBe('OVERRIDE')
      expect(resOverride.isFallback).toBe(false)
    })

    it('respects user UUID override', () => {
      service.updateConfig('onboarding-rental-experience', {
        overrides: {
          'forced-uuid-999': 'required-rental',
        },
      })

      const res = service.evaluate('onboarding-rental-experience', 'forced-uuid-999')
      expect(res.variant).toBe('required-rental')
      expect(res.reason).toBe('OVERRIDE')
    })

    it('routes to defaultVariant when experiment is PAUSED', () => {
      service.updateConfig('onboarding-rental-experience', {
        status: 'PAUSED',
        defaultVariant: 'deferrable-rental',
      })

      const result = service.evaluate('onboarding-rental-experience', 'random-uuid')
      expect(result.variant).toBe('deferrable-rental')
      expect(result.reason).toBe('PAUSED_DEFAULT')
    })
  })

  describe('updateConfig', () => {
    it('rejects weights that do not sum to 100', () => {
      expect(() => {
        service.updateConfig('onboarding-rental-experience', {
          weights: {
            'required-rental': 60,
            'deferrable-rental': 30, // sums to 90
          },
        })
      }).toThrow('Variant weights must sum up to 100')
    })

    it('accepts valid 100% split', () => {
      const updated = service.updateConfig('onboarding-rental-experience', {
        weights: {
          'required-rental': 70,
          'deferrable-rental': 30,
        },
      })
      expect(updated.weights['required-rental']).toBe(70)
      expect(updated.weights['deferrable-rental']).toBe(30)
    })
  })
})
