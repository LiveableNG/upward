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
