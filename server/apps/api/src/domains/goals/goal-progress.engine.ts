import { BadRequestException } from '@nestjs/common'
import { GoalMilestone, GoalProgressSource } from './goal.repository'

export interface ProgressCalculationParams {
  source: GoalProgressSource
  currentProgressPct: number
  newProgressPct?: number
  milestones?: GoalMilestone[]
  currentAmountMinor?: bigint | number | string | null
  targetAmountMinor?: bigint | number | string | null
  rentVaultBalanceMinor?: bigint | null
  rentVaultTargetMinor?: bigint | null
}

export class GoalProgressEngine {
  /**
   * Parses and validates a monetary minor unit value.
   * Enforces: non-negative integer minor units only.
   * Rejects negatives, decimals, floats, and malformed non-numeric values.
   */
  static parseMinorUnits(
    value: bigint | number | string | null | undefined,
    fieldName: string,
  ): bigint | null {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'bigint') {
      if (value < 0n) {
        throw new BadRequestException(`${fieldName} cannot be negative`)
      }
      return value
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new BadRequestException(`${fieldName} must be an integer minor unit without decimals`)
      }
      if (value < 0) {
        throw new BadRequestException(`${fieldName} cannot be negative`)
      }
      return BigInt(value)
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!/^\d+$/.test(trimmed)) {
        throw new BadRequestException(
          `${fieldName} must be a valid non-negative integer minor unit (no decimals or negative values allowed)`,
        )
      }
      return BigInt(trimmed)
    }

    throw new BadRequestException(`${fieldName} must be a valid integer minor unit`)
  }

  /**
   * Calculates progress percentage from milestones:
   * (completed count / total count) * 100 rounded down.
   * Clamped to [0, 100]. Returns 0 if total milestones is 0.
   */
  static calculateFromMilestones(milestones?: GoalMilestone[]): number {
    if (!milestones || milestones.length === 0) {
      return 0
    }
    const total = milestones.length
    const completed = milestones.filter((m) => m.status === 'COMPLETED').length
    const pct = Math.floor((completed / total) * 100)
    return Math.min(100, Math.max(0, pct))
  }

  /**
   * Calculates progress percentage from target and current amounts in minor units.
   * Enforces strict domain invariants:
   * - targetMinor must be strictly positive (> 0)
   * - currentMinor must be non-negative (>= 0)
   * - currentMinor cannot exceed targetMinor
   */
  static calculateFromAmounts(
    currentMinorVal?: bigint | number | string | null,
    targetMinorVal?: bigint | number | string | null,
  ): number {
    const target = this.parseMinorUnits(targetMinorVal, 'targetAmountMinor')
    if (target === null || target <= 0n) {
      throw new BadRequestException('Target amount must be strictly positive for target-amount progress')
    }

    const current = this.parseMinorUnits(currentMinorVal, 'currentAmountMinor') ?? 0n

    if (current > target) {
      throw new BadRequestException('Current amount cannot exceed target amount')
    }

    const pct = Number((current * 100n) / target)
    return Math.min(100, Math.max(0, pct))
  }

  /**
   * Validates and returns progress for a goal based on its progress source.
   * Enforces source-specific domain invariants.
   */
  static validateAndUpdateProgress(params: ProgressCalculationParams): number {
    switch (params.source) {
      case 'MILESTONES':
        if (params.newProgressPct !== undefined) {
          throw new BadRequestException('Manual progress percentage cannot be set for milestone-driven goals')
        }
        return this.calculateFromMilestones(params.milestones)

      case 'MANUAL_PERCENT':
        if (params.newProgressPct !== undefined) {
          if (
            typeof params.newProgressPct !== 'number' ||
            params.newProgressPct < 0 ||
            params.newProgressPct > 100 ||
            !Number.isInteger(params.newProgressPct)
          ) {
            throw new BadRequestException('Progress percentage must be an integer between 0 and 100')
          }
          return params.newProgressPct
        }
        return params.currentProgressPct

      case 'TARGET_AMOUNT':
        if (params.newProgressPct !== undefined) {
          throw new BadRequestException('Manual progress percentage cannot be set for target-amount goals')
        }
        return this.calculateFromAmounts(params.currentAmountMinor, params.targetAmountMinor)

      case 'RENT_VAULT':
        if (params.newProgressPct !== undefined) {
          throw new BadRequestException('Manual progress percentage cannot be set for rent-vault-backed goals')
        }
        if (params.currentAmountMinor !== undefined) {
          throw new BadRequestException('Cannot manually update balance for rent-vault-backed goals')
        }
        // If verified vault balance and target are available, compute progress from principal
        if (params.rentVaultBalanceMinor !== undefined && params.rentVaultTargetMinor) {
          if (params.rentVaultTargetMinor <= 0n) return 0
          const current = params.rentVaultBalanceMinor ?? 0n
          const pct = Number((current * 100n) / params.rentVaultTargetMinor)
          return Math.min(100, Math.max(0, pct))
        }
        return params.currentProgressPct

      case 'STATUS_ONLY':
        if (params.newProgressPct !== undefined) {
          throw new BadRequestException('Progress percentage cannot be set for status-only goals')
        }
        return 0

      default:
        return params.currentProgressPct
    }
  }
}
