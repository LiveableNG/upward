/**
 * Shapes returned by the GT Tenant App read bridge
 * (liveable-landlord-api: api-upward/v1/integration/tenant-app/*), surfaced to
 * the client through the Upward API at /api/v1/tenant-app/*.
 *
 * Field names are snake_case because they come straight off the GT resources
 * (ComplaintHistoryResource, VisitorAccessResource) without renaming.
 */

export interface Complaint {
  complaint_id: string
  category: string
  description: string
  created_at: string
  status: string
  has_vendor: boolean
  files?: Array<{ source: string }>
  pm_messages?: Array<{ message: string; created_at: string; pm_name: string }>
  unit?: {
    id: string
    name: string
    property_address: string
    property_label: string
  }
  manager?: {
    id: string
    first_name: string
    last_name: string
    email: string
    company_name: string
  }
  rating?: {
    /** Numeric string, e.g. "4.3" — averaged across three feedback questions. */
    score: string
    feedback: Array<{ question: string; answer: string }>
  }
}

/** GT FileResource as returned by POST /tenant-app/files. `id` is encoded. */
export type UploadedHomeFile = {
  id: string
  source: string
  caption: string
  type: string
}

export type VisitorStatus =
  | 'ACTIVE'
  | 'EXTENDED'
  | 'EXPIRED'
  | 'OVERSTAY'
  | 'REVOKED'
  | (string & {})

/** Compact hit from visitors/search-list — not a full VisitorAccessResource. */
export type VisitorSearchHit = {
  id: number
  name: string | null
  phone: string | null
  visitor_type: string | null
}

export interface Visitor {
  id: string
  visitor_name: string
  phone: string
  visit_date: string
  visit_time: string
  duration: number
  notes: string | null
  visitor_type: string
  code: string
  status: VisitorStatus
  expires_at: string
  created_at: string
  /** Pre-formatted by GT, e.g. "on 12/08/2026 from 9:00 am to 1:00 pm" */
  details: string
  unit: {
    name: string
    address: string
  }
}

/** GT transaction history row from listTransactions (grouped by date server-side). */
export type GtTransaction = {
  category: string
  additional_information?: string
  amount: string
  status: string
  type: 'debit' | 'credit'
  reference?: string
  payment_method?: string
  payment_gateway?: string
  date: string
}

/** listTransactions returns { data: Record<date, rows>, meta } — not an envelope. */
export type GtTransactionHistoryResponse = {
  data: Record<string, GtTransaction[]>
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

/** Outstanding bill from TransactionRequestResource (pending list). */
export type PendingBill = {
  id: string
  amount: string
  reason: string
  created_at: string
  proof_status?: string | null
  proof_file?: string | null
  file?: string | null
  invoice?: {
    invoice_id: string
    uuid: string
    invoice_number: string
    payment_method?: string
    status?: string
    payment_status?: string
    payment_gateway?: string
    description?: string
  }
}

/** Bank transfer details from GET transactions/pending/:id. */
export type PendingPaymentInfo = {
  id: string
  ref: string
  bank_name: string
  account_number: string
  account_name: string
  amount_info: {
    amount: number
    fees: number
    total_amount: number
    currency: string
  }
}

/** GT document row from DocumentListResource. */
export type HomeDocument = {
  document_id: string
  name: string
  is_custom: boolean
  sent_at: string
  status: 'not_viewed' | 'viewed' | 'downloaded' | string
  template?: {
    id: number
    document_name: string
    document_type: string
  }
  file?: {
    file_id: string
    document_link: string | null
  }
  document_sender?: string
  document_as?: 'email' | 'pdf' | string
  html_payload?: string
  document_subject?: string
  document_cc?: string | null
  attachment_ids?: string[]
  attachments?: Array<{ source?: string }>
}

/** Laravel resource-collection envelope: { data, links, meta }. */
export interface Paginated<T> {
  data: T[]
  links?: {
    first?: string | null
    last?: string | null
    prev?: string | null
    next?: string | null
  }
  meta?: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

/** Envelope used by the non-paginated GT reads. */
export interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

/**
 * Every panel on the My Home hub resolves to one of these. `unavailable` covers
 * the endpoints GT still answers with 501, so the UI can say "not ready yet"
 * rather than showing a generic failure.
 */
export type PanelState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string }
