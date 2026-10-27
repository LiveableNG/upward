export const RENTAL_EXPERIMENT_KEY = 'onboarding-rental-experience' as const

export const RENTAL_EXPERIMENT_VARIANTS = {
  REQUIRED: 'required-rental',
  DEFERRABLE: 'deferrable-rental',
} as const

export type RentalExperimentVariant =
  (typeof RENTAL_EXPERIMENT_VARIANTS)[keyof typeof RENTAL_EXPERIMENT_VARIANTS]

export const RENTAL_EXPERIMENT_START_DATE = '2025-01-01T00:00:00.000Z'

export const RENTAL_FALLBACK_VARIANT = RENTAL_EXPERIMENT_VARIANTS.DEFERRABLE
