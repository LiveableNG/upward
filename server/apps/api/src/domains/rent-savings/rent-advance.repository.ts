import { RentAdvance } from './rent-vault.types'

export interface CreateAdvanceDto {
  vaultId: number
  userId: number
  borrowedAmountKobo: bigint
  facilityFeeKobo: bigint
  totalRepayableKobo: bigint
  repaymentDueDate: Date
  destinationBankCode: string
  destinationAccountNumber: string
  destinationAccountName?: string | null
  payoutTransferReference?: string | null
}

export interface IRentAdvanceRepository {
  create(data: CreateAdvanceDto, tx?: unknown): Promise<RentAdvance>
  findById(id: number, tx?: unknown): Promise<RentAdvance | null>
  findByUuid(uuid: string, tx?: unknown): Promise<RentAdvance | null>
  findActiveByVaultId(vaultId: number, tx?: unknown): Promise<RentAdvance | null>
  findActiveByUserId(userId: number, tx?: unknown): Promise<RentAdvance[]>
  findOverdueAdvances(asOfDate: Date, tx?: unknown): Promise<RentAdvance[]>
  update(id: number, data: Partial<RentAdvance>, tx?: unknown): Promise<RentAdvance>
}

export const RENT_ADVANCE_REPOSITORY = Symbol('RENT_ADVANCE_REPOSITORY')
