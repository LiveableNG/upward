import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

export interface ExperimentConfig {
  key: string
  name: string
  description?: string
  status: 'ACTIVE' | 'PAUSED'
  variants: string[]
  weights: Record<string, number>
  defaultVariant: string
  overrides: Record<string, string> // userId / uuid / email -> variant
  updatedAt: string
}

export interface ExperimentEvaluationResult {
  variant: string
  isFallback: boolean
  reason: 'OVERRIDE' | 'RULE_MATCH' | 'PAUSED_DEFAULT' | 'FALLBACK'
  bucket?: number
}

/**
 * 32-bit FNV-1a deterministic string hashing to integer [0, 99].
 * Produces identical bucket values in Node.js backend and browser JS.
 */
export function hashStringToBucket(key: string, salt: string = ''): number {
  const str = salt ? `${salt}:${key}` : key
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 100
}

const DEFAULT_EXPERIMENTS: Record<string, ExperimentConfig> = {
  'onboarding-rental-experience': {
    key: 'onboarding-rental-experience',
    name: 'Rental Details Onboarding Experience',
    description:
      'Controlled A/B experiment evaluating required rental setup vs deferrable rental setup during onboarding',
    status: 'ACTIVE',
    variants: ['required-rental', 'deferrable-rental'],
    weights: {
      'required-rental': 50,
      'deferrable-rental': 50,
    },
    defaultVariant: 'deferrable-rental',
    overrides: {},
    updatedAt: new Date().toISOString(),
  },
}

@Injectable()
export class AbExperimentService {
  private readonly logger = new Logger(AbExperimentService.name)
  private readonly configFilePath: string
  private configs: Record<string, ExperimentConfig> = { ...DEFAULT_EXPERIMENTS }

  constructor() {
    this.configFilePath = path.resolve(process.cwd(), 'ab-experiments-config.json')
    this.loadPersistedConfig()
  }

  private loadPersistedConfig(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) {
          this.configs = {
            ...DEFAULT_EXPERIMENTS,
            ...parsed,
          }
          this.logger.log(`Loaded persisted experiment configs from ${this.configFilePath}`)
          return
        }
      }
    } catch (err) {
      this.logger.warn(`Could not load persisted config, using defaults: ${(err as Error).message}`)
    }
  }

  private savePersistedConfig(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.configs, null, 2), 'utf-8')
    } catch (err) {
      this.logger.warn(`Could not persist experiment configs: ${(err as Error).message}`)
    }
  }

  public getAllConfigs(): ExperimentConfig[] {
    return Object.values(this.configs)
  }

  public getConfig(key: string): ExperimentConfig | null {
    return this.configs[key] || null
  }

  public getPublicConfigs(): Record<string, {
    key: string
    status: 'ACTIVE' | 'PAUSED'
    variants: string[]
    weights: Record<string, number>
    defaultVariant: string
    overrides: Record<string, string>
    updatedAt: string
  }> {
    const result: Record<string, any> = {}
    for (const [key, conf] of Object.entries(this.configs)) {
      result[key] = {
        key: conf.key,
        status: conf.status,
        variants: conf.variants,
        weights: conf.weights,
        defaultVariant: conf.defaultVariant,
        overrides: conf.overrides,
        updatedAt: conf.updatedAt,
      }
    }
    return result
  }

  public updateConfig(
    key: string,
    patch: {
      status?: 'ACTIVE' | 'PAUSED'
      weights?: Record<string, number>
      overrides?: Record<string, string>
      defaultVariant?: string
      description?: string
    },
  ): ExperimentConfig {
    const current = this.configs[key] || {
      key,
      name: key,
      status: 'ACTIVE',
      variants: ['required-rental', 'deferrable-rental'],
      weights: { 'required-rental': 50, 'deferrable-rental': 50 },
      defaultVariant: 'deferrable-rental',
      overrides: {},
      updatedAt: new Date().toISOString(),
    }

    // Validate weights sum to 100 if provided
    if (patch.weights) {
      const sum = Object.values(patch.weights).reduce((a, b) => a + Number(b), 0)
      if (sum !== 100) {
        throw new Error(`Variant weights must sum up to 100 (got ${sum})`)
      }
    }

    this.configs[key] = {
      ...current,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.weights ? { weights: patch.weights } : {}),
      ...(patch.overrides ? { overrides: patch.overrides } : {}),
      ...(patch.defaultVariant ? { defaultVariant: patch.defaultVariant } : {}),
      ...(patch.description ? { description: patch.description } : {}),
      updatedAt: new Date().toISOString(),
    }

    this.savePersistedConfig()
    this.logger.log(`Updated experiment config for [${key}]`)
    return this.configs[key]
  }

  public evaluate(
    key: string,
    userIdentifier?: string | null,
    userEmail?: string | null,
  ): ExperimentEvaluationResult {
    const conf = this.configs[key]
    if (!conf) {
      return {
        variant: 'deferrable-rental',
        isFallback: true,
        reason: 'FALLBACK',
      }
    }

    // 1. Check specific overrides (by email or uuid)
    if (userEmail) {
      const emailOverride = conf.overrides[userEmail.toLowerCase()]
      if (emailOverride) {
        return {
          variant: emailOverride,
          isFallback: false,
          reason: 'OVERRIDE',
        }
      }
    }
    if (userIdentifier) {
      const idOverride = conf.overrides[userIdentifier]
      if (idOverride) {
        return {
          variant: idOverride,
          isFallback: false,
          reason: 'OVERRIDE',
        }
      }
    }

    // 2. Check experiment status
    if (conf.status === 'PAUSED') {
      return {
        variant: conf.defaultVariant,
        isFallback: false,
        reason: 'PAUSED_DEFAULT',
      }
    }

    // 3. Deterministic hashing allocation
    if (!userIdentifier) {
      return {
        variant: conf.defaultVariant,
        isFallback: true,
        reason: 'FALLBACK',
      }
    }

    const bucket = hashStringToBucket(userIdentifier, key)
    let cumulative = 0

    for (const variant of conf.variants) {
      const weight = conf.weights[variant] ?? 0
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

    // Default to last variant or defaultVariant
    return {
      variant: conf.defaultVariant,
      isFallback: false,
      reason: 'RULE_MATCH',
      bucket,
    }
  }
}
