import { RentSettlement } from './rent-vault.types'

export interface CreateSettlementDto {
  vaultId: number
  userId: number
  landlordBankCode: string
  landlordAccountNumber: string
  landlordName: string
  propertyAddress?: string | null
  amountPaidToLandlordKobo: bigint
  cashbackCreditedKobo: bigint
  earlyBirdMultiplierApplied?: boolean
  nipSessionId?: string | null
  settlementReference: string
  receiptPdfUrl?: string | null
  settlementStatus?: RentSettlement['settlementStatus']
  smsAlertDispatched?: boolean
  disburseSurplusToWallet?: boolean
}

export interface IRentSettlementRepository {
  create(data: CreateSettlementDto, tx?: unknown): Promise<RentSettlement>
  findById(id: number, tx?: unknown): Promise<RentSettlement | null>
  findByUuid(uuid: string, tx?: unknown): Promise<RentSettlement | null>
  findByVaultId(vaultId: number, tx?: unknown): Promise<RentSettlement | null>
  findByReference(reference: string, tx?: unknown): Promise<RentSettlement | null>
  update(id: number, data: Partial<RentSettlement>, tx?: unknown): Promise<RentSettlement>
}

export const RENT_SETTLEMENT_REPOSITORY = Symbol('RENT_SETTLEMENT_REPOSITORY')
