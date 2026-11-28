/**
 * Explicit funding & routing classifications for funds held on a user's
 * Upward Dedicated Virtual Account (DVA) holding wallet (`upward_wallet`).
 *
 * Every credit/debit entry records `fundingType`, `holdingLocation`,
 * `routingTarget`, and `routingStatus` so the platform always knows:
 * 1. Why the funds are on the user's DVA (cashback, surplus, unallocated DVA inflow, ARM failure fallback).
 * 2. Where the funds should move next (next Rent Savings vault, ARM retry, rent payment, or bank payout).
 */

export type DvaWalletTxType =
  | 'SETTLEMENT_SURPLUS'
  | 'SETTLEMENT_CASHBACK'
  | 'ACTIVATION_CASHBACK'
  | 'UNALLOCATED_DVA_INFLOW'
  | 'ARM_SUBSCRIPTION_FALLBACK'
  | 'PREFUND'
  | 'WALLET_DEPOSIT'
  | 'INTEREST'
  | 'SWEEP_TO_RENT_VAULT'
  | 'SWEEP_TO_ARM'
  | 'PAYOUT_TO_BANK'

export type DvaHoldingLocation = 'USER_DVA_WALLET' | 'RENT_VAULT' | 'ARM_MMF' | 'LANDLORD_BANK' | 'USER_BANK'

export type DvaHoldingRoutingTarget =
  | 'HOLD_IN_DVA'
  | 'NEXT_RENT_VAULT'
  | 'RETRY_ARM_SUBSCRIPTION'
  | 'RENT_PAYMENT'
  | 'USER_BANK_PAYOUT'

export type DvaHoldingRoutingStatus = 'HELD' | 'ROUTED' | 'FAILED_PENDING_RETRY'

export interface DvaWalletTxMetadata {
  fundingType: DvaWalletTxType
  holdingLocation: DvaHoldingLocation
  routingTarget: DvaHoldingRoutingTarget
  routingStatus: DvaHoldingRoutingStatus
  dvaAccountNumber?: string | null
  sourceVaultId?: number | null
  targetVaultId?: number | null
  sourceReference?: string | null
  settlementReference?: string | null
  armJobId?: number | null
  armJobUuid?: string | null
  [key: string]: unknown
}
