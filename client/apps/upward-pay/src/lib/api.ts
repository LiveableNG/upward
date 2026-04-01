const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://upward-api-pnqn.vercel.app/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('upward_token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `Request failed: ${res.status}`)
  }

  return res.json()
}

/* ─── Public Endpoints ─── */

export interface PaymentRequestData {
  paymentRequest: {
    uuid: string
    totalAmount: number
    currency: string
    status: string
    invoiceNumber: string
    notes: string
    createdAt: string
  }
  company: {
    uuid: string
    name: string
    logoUrl: string
    email: string
  }
  property: {
    uuid: string
    name: string
    address: string
  } | null
  tenant: {
    uuid: string
    fullName: string
    email: string
    signupStatus: string
  } | null
  lineItems: {
    uuid: string
    label: string
    category: string
    amount: number
  }[]
}

export interface InvitationData {
  invitation: {
    uuid: string
    tenantName: string
    tenantEmail: string
    status: string
    createdAt: string
  }
  company: {
    uuid: string
    name: string
    logoUrl: string
  }
  property: {
    uuid: string
    name: string
    address: string
  } | null
  tenantSignupStatus: string // 'app_installed' | 'web_only' | 'not_signed_up' | 'not_found'
}

export interface TenantProfile {
  uuid: string
  email: string
  fullName: string
  phone: string
  signupStatus: string
  dateOfBirth?: string
  gender?: string
  occupation?: string
  maritalStatus?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  address?: string
  rentAnniversary?: string
  membershipLevel: string
  totalInvites: number
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tenant: TenantProfile
}

export interface DashboardData {
  tenant: TenantProfile
  pendingPayments: Array<{
    uuid: string
    total_amount: number
    currency: string
    status: string
    payment_link_token: string
    invoice_number: string
    notes: string
    company_name: string
    company_logo: string
  }>
  completedPayments: Array<{
    uuid: string
    amount: number
    currency: string
    status: string
    channel: string
    paid_at: string
    paystack_reference: string
    company_name: string
  }>
}

export interface PaymentInitResponse {
  status: boolean
  message: string
  data: {
    reference: string
    amount: number
    currency: string
    authorization_url: string
    access_code: string
  }
}

export interface PaymentVerifyResponse {
  status: boolean
  message: string
  data: {
    reference: string
    transactionUuid: string
    status: string
    amount: number
    paidAt: string
    receipt: {
      invoiceNumber: string
      message: string
    }
  }
}

export interface ReceiptData {
  uuid: string
  title: string
  receiptNumber: string
  amount: number
  currency: string
  lineItems: { label: string; category: string; amount: number }[]
  tenantName: string
  companyName: string
  companyLogo: string
  propertyName: string
  propertyAddress: string
  paidAt: string
  channel: string
  paystackReference: string
  generatedAt: string
  type?: 'debit' | 'credit'
}

export interface ContractData {
  uuid: string
  title: string
  fileName: string
  companyName: string
  companyLogo: string
  propertyName: string
  propertyAddress: string
  leaseStart: string
  leaseEnd: string
  contractType: string
  createdAt: string
}

export interface RentCreditData {
  score: number
  maxScore: number
  grade: string
  totalPayments: number
  totalAmountPaid: number
  monthsTracked: number
  onTimeRate: number
  streak: number
}

export interface DocumentsData {
  receipts: ReceiptData[]
  contracts: ContractData[]
  rentCredit: RentCreditData
}

export const api = {
  fetchPaymentRequest: (token: string) =>
    request<PaymentRequestData>(`/public/payment-request/${token}`),

  fetchInvitation: (token: string) => request<InvitationData>(`/public/invitation/${token}`),

  signup: (data: { email: string; password: string; fullName: string; phone?: string }) =>
    request<AuthResponse>('/tenant-auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/tenant-auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<DashboardData>('/tenant-auth/me'),

  initializePayment: (data: { paymentToken: string; email: string; amount?: number }) =>
    request<PaymentInitResponse>('/pay/initialize', { method: 'POST', body: JSON.stringify(data) }),

  // Guest payment — no auth token needed, uses public endpoint
  guestInitializePayment: (data: { paymentToken: string; email: string }) =>
    request<PaymentInitResponse>('/public/pay/guest-initialize', { method: 'POST', body: JSON.stringify(data) }),

  verifyPayment: (reference: string) =>
    request<PaymentVerifyResponse>(`/pay/verify/${reference}`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  getMyDocuments: () => request<DocumentsData>('/documents/mine'),

  getReceipt: (uuid: string) => request<ReceiptData>(`/documents/receipt/${uuid}`),

  updateProfile: (data: Partial<TenantProfile>) =>
    request<{ success: boolean; tenant: TenantProfile }>('/tenant-auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Complete profile after guest payment — creates account from PM-sourced tenant record
  completeProfile: (data: { email: string; password: string; phone?: string; dateOfBirth?: string; occupation?: string; gender?: string }) =>
    request<AuthResponse>('/tenant-auth/complete-profile', { method: 'POST', body: JSON.stringify(data) }),

  togglePaymentStatus: (token: string, status: string) =>
    request<{ success: boolean; status: string }>(`/public/test/toggle-payment/${token}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  toggleGuestPaymentStatus: (token: string, status: string) =>
    request<{ success: boolean; status: string }>(`/public/test/toggle-payment/${token}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
}
