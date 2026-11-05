export type RefundStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED_REFUND'
  | 'RESOLVED_PAYOUT'
  | 'SETTLED_COMPROMISE'
  | 'CLOSED'

export interface CommerceRefundAttempt {
  id?: number
  uuid: string
  refundId: number
  gatewayReference: string
  paystackRefundId?: string | null
  status: string
  gatewayResponse?: string | null
  createdAt?: Date
}

export interface CommerceRefund {
  id?: number
  uuid: string
  subOrderId: number
  amountKobo: bigint
  reason: string
  status: RefundStatus
  requestedBy: string
  approvedBy?: string | null
  approvedAt?: Date | null
  completedAt?: Date | null
  subOrder?: any
  attempts?: CommerceRefundAttempt[]
  createdAt?: Date
  updatedAt?: Date
}

export interface CommerceDispute {
  id?: number
  uuid: string
  subOrderId: number
  userId: number
  status: DisputeStatus
  reason: string
  explanation: string
  evidenceUrls?: any
  resolutionNotes?: string | null
  resolvedAt?: Date | null
  resolvedBy?: string | null
  subOrder?: any
  createdAt?: Date
  updatedAt?: Date
}

export interface CommerceRefundRepository {
  createRefund(data: {
    subOrderId: number
    amountKobo: bigint
    reason: string
    requestedBy: string
    status?: RefundStatus
  }): Promise<CommerceRefund>
  findRefundById(id: number): Promise<CommerceRefund | null>
  findRefundByUuid(uuid: string): Promise<CommerceRefund | null>
  findRefunds(filter?: {
    status?: RefundStatus
    skip?: number
    take?: number
  }): Promise<{ items: CommerceRefund[]; total: number }>
  updateRefundStatus(
    refundId: number,
    status: RefundStatus,
    approvedBy?: string,
    approvedAt?: Date,
    completedAt?: Date,
  ): Promise<CommerceRefund>
  recordRefundAttempt(
    refundId: number,
    attempt: {
      gatewayReference: string
      paystackRefundId?: string
      status: string
      gatewayResponse?: string
    },
  ): Promise<CommerceRefundAttempt>
  findRefundAttemptByReference(reference: string): Promise<CommerceRefundAttempt | null>

  // Disputes
  createDispute(data: {
    subOrderId: number
    userId: number
    reason: string
    explanation: string
    evidenceUrls?: string[]
  }): Promise<CommerceDispute>
  findDisputeById(id: number): Promise<CommerceDispute | null>
  findDisputeByUuid(uuid: string): Promise<CommerceDispute | null>
  findDisputes(filter?: {
    status?: DisputeStatus
    skip?: number
    take?: number
  }): Promise<{ items: CommerceDispute[]; total: number }>
  resolveDispute(
    disputeId: number,
    data: {
      status: DisputeStatus
      resolutionNotes: string
      resolvedBy: string
    },
  ): Promise<CommerceDispute>
}

export const COMMERCE_REFUND_REPOSITORY = Symbol('COMMERCE_REFUND_REPOSITORY')
