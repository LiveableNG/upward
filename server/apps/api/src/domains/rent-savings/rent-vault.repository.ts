import { RentVault, RentVaultTransaction, RentSavingsScore } from './rent-vault.types'

export interface CreateVaultDto {
  userId: number
  targetAmountKobo: bigint
  currentPrincipalKobo?: bigint
  accruedYieldKobo?: bigint
  cadence: RentVault['cadence']
  contractualDueDate: Date
  unlockDate: Date
  lockStatus?: RentVault['lockStatus']
  preferredFundingMethod: RentVault['preferredFundingMethod']
  paydayDayOfMonth?: number | null
  cardAuthorizationCode?: string | null
  dvaBankName?: string | null
  dvaAccountNumber?: string | null
  dvaAccountName?: string | null
  dvaCustomerCode?: string | null
  dvaAssignmentStatus?: string
  autoBypassPmApproval?: boolean
  investmentProvider?: string
  providerMembershipId?: string | null
  providerAccountNumber?: string | null
  providerCrmStatus?: string | null
}

export interface IRentVaultRepository {
  create(data: CreateVaultDto, tx?: unknown): Promise<RentVault>
  findById(id: number, tx?: unknown): Promise<RentVault | null>
  findByUuid(uuid: string, tx?: unknown): Promise<RentVault | null>
  findActiveByUserId(userId: number, tx?: unknown): Promise<RentVault | null>
  findByDvaAccountNumber(accountNumber: string, tx?: unknown): Promise<RentVault | null>
  findMaturedLockedVaults(asOfDate: Date, tx?: unknown): Promise<RentVault[]>
  update(id: number, data: Partial<RentVault>, tx?: unknown): Promise<RentVault>
  incrementBalances(
    id: number,
    principalDeltaKobo: bigint,
    yieldDeltaKobo: bigint,
    tx?: unknown,
  ): Promise<RentVault>

  // Ledger transactions
  createTransaction(
    data: Omit<RentVaultTransaction, 'id' | 'uuid' | 'createdAt'>,
    tx?: unknown,
  ): Promise<RentVaultTransaction>
  findTransactionsByVaultId(
    vaultId: number,
    limit?: number,
    tx?: unknown,
  ): Promise<RentVaultTransaction[]>
  findTransactionByReference(reference: string, tx?: unknown): Promise<RentVaultTransaction | null>

  // Savings score
  upsertSavingsScore(
    vaultId: number,
    userId: number,
    data: Partial<
      Omit<RentSavingsScore, 'id' | 'uuid' | 'vaultId' | 'userId' | 'createdAt' | 'updatedAt'>
    >,
    tx?: unknown,
  ): Promise<RentSavingsScore>
  findSavingsScoreByVaultId(vaultId: number, tx?: unknown): Promise<RentSavingsScore | null>
}

export const RENT_VAULT_REPOSITORY = Symbol('RENT_VAULT_REPOSITORY')
