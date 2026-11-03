import { API_BASE } from './api-client'

export interface ClientExperimentConfig {
  key: string
  status: 'ACTIVE' | 'PAUSED'
  variants: string[]
  weights: Record<string, number>
  defaultVariant: string
  overrides: Record<string, string>
  updatedAt?: string
}

export interface ClientEvaluationResult {
  variant: string
  isFallback: boolean
  reason: 'OVERRIDE' | 'RULE_MATCH' | 'PAUSED_DEFAULT' | 'FALLBACK' | 'LOADING'
  bucket?: number
}

export function hashStringToBucket(key: string, salt: string = ''): number {
  const str = salt ? `${salt}:${key}` : key
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 100
}

const DEFAULT_CONFIGS: Record<string, ClientExperimentConfig> = {
  'onboarding-rental-experience': {
    key: 'onboarding-rental-experience',
    status: 'ACTIVE',
    variants: ['required-rental', 'deferrable-rental'],
    weights: {
      'required-rental': 50,
      'deferrable-rental': 50,
    },
    defaultVariant: 'deferrable-rental',
    overrides: {},
  },
}

const STORAGE_KEY = 'upward_ab_experiments_config'

class AbExperimentClient {
  private configs: Record<string, ClientExperimentConfig> = { ...DEFAULT_CONFIGS }
  private hasSynced = false
  private syncPromise: Promise<void> | null = null

  constructor() {
    this.loadFromStorage()
    if (typeof window !== 'undefined') {
      this.syncFromBackend().catch(() => {})
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          this.configs = {
            ...DEFAULT_CONFIGS,
            ...parsed,
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs))
    } catch {
      // Ignore quota errors
    }
  }

  public async syncFromBackend(): Promise<void> {
    if (this.syncPromise) return this.syncPromise

    this.syncPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/experiments/config`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          const body = await res.json()
          if (body.success && body.data) {
            this.configs = {
              ...this.configs,
              ...body.data,
            }
            this.hasSynced = true
            this.saveToStorage()
          }
        }
      } catch (err) {
        // Fallback silently to bundled/cached config
      } finally {
        this.syncPromise = null
      }
    })()

    return this.syncPromise
  }

  public evaluate(
    experimentKey: string,
    userUuid?: string | null,
    userEmail?: string | null,
  ): ClientEvaluationResult {
    const config = this.configs[experimentKey] || DEFAULT_CONFIGS[experimentKey]
    if (!config) {
      return {
        variant: 'deferrable-rental',
        isFallback: true,
        reason: 'FALLBACK',
      }
    }

    // 1. Explicit email or UUID override
    if (userEmail) {
      const emailOverride = config.overrides[userEmail.toLowerCase()]
      if (emailOverride) {
        return {
          variant: emailOverride,
          isFallback: false,
          reason: 'OVERRIDE',
        }
      }
    }
    if (userUuid) {
      const uuidOverride = config.overrides[userUuid]
      if (uuidOverride) {
        return {
          variant: uuidOverride,
          isFallback: false,
          reason: 'OVERRIDE',
        }
      }
    }

    // 2. Experiment status check
    if (config.status === 'PAUSED') {
      return {
        variant: config.defaultVariant,
        isFallback: false,
        reason: 'PAUSED_DEFAULT',
      }
    }

    // 3. Fallback if no user identifier
    if (!userUuid) {
      return {
        variant: config.defaultVariant,
        isFallback: true,
        reason: 'FALLBACK',
      }
    }

    // 4. Deterministic hash allocation
    const bucket = hashStringToBucket(userUuid, experimentKey)
    let cumulative = 0

    for (const variant of config.variants) {
      const weight = config.weights[variant] ?? 0
      cumulative += weight
      if (bucket < cumulative) {
        return {
          variant,
          isFallback: false,
          reason: 'RULE_MATCH',
          bucket,
        }
      }
    }

    return {
      variant: config.defaultVariant,
      isFallback: false,
      reason: 'RULE_MATCH',
      bucket,
    }
  }
}

export const abExperimentClient = new AbExperimentClient()
