export type UploadedHomeFile = {
  id: string
  source: string
  caption: string
  type: string
}

export type ComplaintFeedbackItem = {
  question: string
  answer?: string
}

export type Complaint = {
  complaint_id: string
  category: string
  description: string
  created_at: string
  status: string
  has_vendor?: boolean
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
    score: string
    feedback: ComplaintFeedbackItem[]
  }
}

export type Visitor = {
  id: string
  visitor_name: string
  phone: string
  visitor_type: string
  code: string
  status: string
  details: string
  expires_at?: string
  unit?: { name: string; address: string }
}

export type PendingBill = {
  id: string
  amount: string
  reason: string
  created_at: string
  proof_status?: string | null
}

export type HomeDocument = {
  document_id: string
  name: string
  is_custom: boolean
  sent_at: string
  status: string
  document_subject?: string
  file?: { document_link: string | null }
}

export type Paginated<T> = {
  data: T[]
  meta?: { total?: number }
}

export type Envelope<T> = {
  success?: boolean
  message?: string
  data: T
}

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

export type GtTransactionHistoryResponse = {
  data: Record<string, GtTransaction[]>
  meta?: {
    current_page: number
    last_page: number
  }
}
