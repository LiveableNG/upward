export type VendorPayableStatus =
  | 'PENDING_FULFILMENT'
  | 'IN_COOLING_PERIOD'
  | 'ELIGIBLE_FOR_PAYOUT'
  | 'PAYOUT_SUBMITTED'
  | 'PAID_OUT'
  | 'HELD_FOR_DISPUTE'
  | 'VOIDED_REFUNDED'

export type PayoutTransferStatus = 'INITIATED' | 'SUBMITTED' | 'SUCCESSFUL' | 'FAILED' | 'REVERSED'

export interface PayoutTransferAttempt {
  id?: number
  uuid: string
  payableId: number
  transferReference: string
  paystackTransferCode?: string | null
  status: PayoutTransferStatus
  makerAdminId: string
  checkerAdminId?: string | null
  gatewayResponse?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface CommerceVendorPayable {
  id?: number
  uuid: string
  subOrderId: number
  vendorId: number
  status: VendorPayableStatus
  grossAmountKobo: bigint
  commissionKobo: bigint
  netPayableKobo: bigint
  bankCode: string
  accountNumber: string
  accountName: string
  eligibleAt?: Date | null
  paidAt?: Date | null
  subOrder?: any
  vendor?: any
  transferAttempts?: PayoutTransferAttempt[]
  createdAt?: Date
  updatedAt?: Date
}

export interface VendorPayableSummary {
  vendorId: number
  vendorName: string
  vendorSlug: string
  totalPayablesCount: number
  totalGrossKobo: bigint
  totalCommissionKobo: bigint
  totalNetPayableKobo: bigint
  eligiblePayoutKobo: bigint
  heldDisputeKobo: bigint
  paidOutKobo: bigint
}

export interface VendorPayableRepository {
  createPayable(data: {
    subOrderId: number
    vendorId: number
    grossAmountKobo: bigint
    commissionKobo: bigint
    netPayableKobo: bigint
    bankCode: string
    accountNumber: string
    accountName: string
  }): Promise<CommerceVendorPayable>
  findPayableBySubOrderId(subOrderId: number): Promise<CommerceVendorPayable | null>
  findPayableByUuid(uuid: string): Promise<CommerceVendorPayable | null>
  findPayablesByVendorId(
    vendorId: number,
    options?: { status?: VendorPayableStatus; skip?: number; take?: number },
  ): Promise<{ items: CommerceVendorPayable[]; total: number }>
  getVendorPayablesSummary(): Promise<VendorPayableSummary[]>
  getVendorDetailSummary(vendorId: number): Promise<VendorPayableSummary | null>
  updatePayableStatus(
    payableId: number,
    status: VendorPayableStatus,
    eligibleAt?: Date,
    paidAt?: Date,
  ): Promise<CommerceVendorPayable>
  recordTransferAttempt(
    payableId: number,
    attempt: {
      transferReference: string
      paystackTransferCode?: string
      status: PayoutTransferStatus
      makerAdminId: string
      checkerAdminId?: string
      gatewayResponse?: string
    },
  ): Promise<PayoutTransferAttempt>
  findTransferAttemptByReference(reference: string): Promise<PayoutTransferAttempt | null>
  updateTransferAttemptStatus(
    attemptId: number,
    status: PayoutTransferStatus,
    gatewayResponse?: string,
  ): Promise<PayoutTransferAttempt>
}

export const VENDOR_PAYABLE_REPOSITORY = Symbol('VENDOR_PAYABLE_REPOSITORY')
