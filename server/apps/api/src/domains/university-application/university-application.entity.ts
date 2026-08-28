import { randomUUID } from 'node:crypto'

export type ApplicationStatus = 'SUBMITTED' | 'REVIEWED' | 'ADMITTED' | 'REJECTED' | 'FEE_PAID' | 'REFUNDED'
export type FeeStatus = 'PENDING' | 'PAID' | 'REFUNDED'

export interface UniversityApplicationProps {
  id?: string
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  occupation?: string | null
  experienceLevel?: string | null
  goals?: string | null
  commitment: string
  why: string
  timing?: string | null
  status?: ApplicationStatus
  applicationFee?: number
  feeStatus?: FeeStatus
  paymentRef?: string | null
  notes?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class UniversityApplication {
  private constructor(private readonly props: UniversityApplicationProps) {
    this.validate()
  }

  static create(props: Omit<UniversityApplicationProps, 'createdAt' | 'updatedAt' | 'status' | 'feeStatus' | 'applicationFee'> & { status?: ApplicationStatus; feeStatus?: FeeStatus; applicationFee?: number }): UniversityApplication {
    return new UniversityApplication({
      ...props,
      id: props.id || randomUUID(),
      status: props.status || 'SUBMITTED',
      feeStatus: props.feeStatus || 'PENDING',
      applicationFee: props.applicationFee ?? 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(props: UniversityApplicationProps): UniversityApplication {
    return new UniversityApplication(props)
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('Full name is required')
    }
    if (!this.props.whatsapp || this.props.whatsapp.trim().length === 0) {
      throw new Error('WhatsApp contact is required')
    }
    if (!this.props.email || this.props.email.trim().length === 0) {
      throw new Error('Email address is required')
    }
    if (!this.props.city || this.props.city.trim().length === 0) {
      throw new Error('City is required')
    }
    if (!this.props.commitment || this.props.commitment.trim().length === 0) {
      throw new Error('Commitment response is required')
    }
    if (!this.props.why || this.props.why.trim().length === 0) {
      throw new Error('Reason for joining is required')
    }
  }

  get id(): string | undefined {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get whatsapp(): string {
    return this.props.whatsapp
  }
  get email(): string {
    return this.props.email
  }
  get city(): string {
    return this.props.city
  }
  get ageBracket(): string {
    return this.props.ageBracket
  }
  get occupation(): string | null | undefined {
    return this.props.occupation
  }
  get experienceLevel(): string | null | undefined {
    return this.props.experienceLevel
  }
  get goals(): string | null | undefined {
    return this.props.goals
  }
  get commitment(): string {
    return this.props.commitment
  }
  get why(): string {
    return this.props.why
  }
  get timing(): string | null | undefined {
    return this.props.timing
  }
  get status(): ApplicationStatus | undefined {
    return this.props.status
  }
  get applicationFee(): number | undefined {
    return this.props.applicationFee
  }
  get feeStatus(): FeeStatus | undefined {
    return this.props.feeStatus
  }
  get paymentRef(): string | null | undefined {
    return this.props.paymentRef
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

  toObject(): UniversityApplicationProps {
    return { ...this.props }
  }
}
