import { randomUUID } from 'node:crypto'

export interface WaitlistEntryProps {
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  role?: string | null
  benefits: string[]
  acceptTerms: boolean
  wantsAmbassador: boolean
  country?: string | null
  city?: string | null
  selectedSession?: string | null
  createdAt: Date
  updatedAt: Date
  campaignWeekSent: number
  confirmationSent: boolean
  confirmationEmailStatus?: string | null
  confirmationEmailError?: string | null
  confirmationEmailRetries: number
  abVariant?: string | null
  unsubscribed: boolean
  unsubscribedAt?: Date | null
}

export class WaitlistEntry {
  private constructor(
    private readonly props: WaitlistEntryProps,
    private readonly id: string,
  ) {
    this.validate()
  }

  static create(
    props: Omit<
      WaitlistEntryProps,
      | 'createdAt'
      | 'updatedAt'
      | 'campaignWeekSent'
      | 'confirmationSent'
      | 'confirmationEmailRetries'
      | 'unsubscribed'
    >,
  ): WaitlistEntry {
    return new WaitlistEntry(
      {
        ...props,
        benefits: props.benefits || [],
        campaignWeekSent: 0,
        confirmationSent: false,
        confirmationEmailRetries: 0,
        unsubscribed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      randomUUID(),
    )
  }

  static reconstitute(id: string, props: WaitlistEntryProps): WaitlistEntry {
    return new WaitlistEntry(props, id)
  }

  // --- Getters ---
  get getId(): string {
    return this.id
  }
  get email() {
    return this.props.email
  }
  get role() {
    return this.props.role
  }
  get acceptTerms() {
    return this.props.acceptTerms
  }

  // Return a cloned object to prevent external mutation
  getProps(): WaitlistEntryProps {
    return { ...this.props }
  }

  // --- Invariants ---
  private validate() {
    if (!this.props.email || !this.props.email.includes('@')) {
      throw new Error('WaitlistEntry requires a valid email address')
    }
  }

  // --- Business Logic ---
  updateProfile(props: Partial<WaitlistEntryProps>) {
    if (props.firstName !== undefined) this.props.firstName = props.firstName
    if (props.lastName !== undefined) this.props.lastName = props.lastName
    if (props.phone !== undefined) this.props.phone = props.phone
    if (props.role !== undefined) this.props.role = props.role
    if (props.benefits !== undefined && props.benefits.length > 0)
      this.props.benefits = props.benefits
    if (props.acceptTerms !== undefined) this.props.acceptTerms = props.acceptTerms
    if (props.wantsAmbassador !== undefined) this.props.wantsAmbassador = props.wantsAmbassador
    if (props.country !== undefined) this.props.country = props.country
    if (props.city !== undefined) this.props.city = props.city
    if (props.selectedSession !== undefined) this.props.selectedSession = props.selectedSession
    if (props.abVariant !== undefined) this.props.abVariant = props.abVariant

    this.props.updatedAt = new Date()
  }

  markConfirmationEmailSent() {
    this.props.confirmationSent = true
    this.props.confirmationEmailStatus = 'SENT'
    this.props.updatedAt = new Date()
  }

  markConfirmationEmailFailed(error: string) {
    this.props.confirmationSent = false
    this.props.confirmationEmailStatus = 'FAILED'
    this.props.confirmationEmailError = error
    this.props.confirmationEmailRetries += 1
    this.props.updatedAt = new Date()
  }

  unsubscribe() {
    if (this.props.unsubscribed) {
      throw new Error('User is already unsubscribed')
    }
    this.props.unsubscribed = true
    this.props.unsubscribedAt = new Date()
    this.props.updatedAt = new Date()
  }

  advanceCampaignWeek(week: number) {
    if (week <= this.props.campaignWeekSent) {
      throw new Error('Cannot advance to a previous or current campaign week')
    }
    this.props.campaignWeekSent = week
    this.props.updatedAt = new Date()
  }
}
