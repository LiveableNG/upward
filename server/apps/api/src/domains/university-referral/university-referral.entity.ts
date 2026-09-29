import { randomUUID } from 'node:crypto'

export interface UniversityReferralProps {
  id?: string
  referrerEarlyAccessId?: string | null
  referrerName: string
  referrerEmail?: string | null
  referrerPhone: string
  referredName?: string | null
  referredEmail?: string | null
  referredPhone?: string | null
  status: string // PENDING | JOINED | PAID | INELIGIBLE
  rewardPercentage: number
  rewardAmount?: number | null
  rewardStatus: string // PENDING | APPROVED | PAID
  programFeePaid?: number | null
  paymentRef?: string | null
  joinedAt?: Date | null
  emailSent: boolean
  emailSentAt?: Date | null
  ineligibleReason?: string | null
  notes?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class UniversityReferral {
  private constructor(private readonly props: UniversityReferralProps) {
    this.validate()
  }

  static create(props: Omit<UniversityReferralProps, 'createdAt' | 'updatedAt'>): UniversityReferral {
    return new UniversityReferral({
      ...props,
      id: props.id || randomUUID(),
      rewardPercentage: props.rewardPercentage ?? 10.0,
      rewardStatus: props.rewardStatus ?? 'PENDING',
      status: props.status ?? 'PENDING',
      emailSent: props.emailSent ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(props: UniversityReferralProps): UniversityReferral {
    return new UniversityReferral(props)
  }

  private validate(): void {
    if (!this.props.referrerName || this.props.referrerName.trim().length === 0) {
      throw new Error('Referrer name is required')
    }
    if (!this.props.referrerPhone || this.props.referrerPhone.trim().length === 0) {
      throw new Error('Referrer phone is required')
    }
    if (!this.props.referredEmail && !this.props.referredPhone) {
      throw new Error('At least one contact method (email or phone) is required for the referred individual')
    }
  }

  get id(): string | undefined {
    return this.props.id
  }
  get referrerEarlyAccessId(): string | null | undefined {
    return this.props.referrerEarlyAccessId
  }
  get referrerName(): string {
    return this.props.referrerName
  }
  get referrerEmail(): string | null | undefined {
    return this.props.referrerEmail
  }
  get referrerPhone(): string {
    return this.props.referrerPhone
  }
  get referredName(): string | null | undefined {
    return this.props.referredName
  }
  get referredEmail(): string | null | undefined {
    return this.props.referredEmail
  }
  get referredPhone(): string | null | undefined {
    return this.props.referredPhone
  }
  get status(): string {
    return this.props.status
  }
  get rewardPercentage(): number {
    return this.props.rewardPercentage
  }
  get rewardAmount(): number | null | undefined {
    return this.props.rewardAmount
  }
  get rewardStatus(): string {
    return this.props.rewardStatus
  }
  get programFeePaid(): number | null | undefined {
    return this.props.programFeePaid
  }
  get paymentRef(): string | null | undefined {
    return this.props.paymentRef
  }
  get joinedAt(): Date | null | undefined {
    return this.props.joinedAt
  }
  get emailSent(): boolean {
    return this.props.emailSent
  }
  get emailSentAt(): Date | null | undefined {
    return this.props.emailSentAt
  }
  get ineligibleReason(): string | null | undefined {
    return this.props.ineligibleReason
  }
  get notes(): string | null | undefined {
    return this.props.notes
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  markEmailSent(): void {
    this.props.emailSent = true
    this.props.emailSentAt = new Date()
    this.props.updatedAt = new Date()
  }

  markAsJoined(amountPaid: number, paymentRef?: string): void {
    this.props.status = 'JOINED'
    this.props.programFeePaid = amountPaid
    this.props.paymentRef = paymentRef
    this.props.rewardAmount = (amountPaid * this.props.rewardPercentage) / 100
    this.props.joinedAt = new Date()
    this.props.updatedAt = new Date()
  }

  toObject(): UniversityReferralProps {
    return { ...this.props }
  }
}
