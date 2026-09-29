import { randomUUID } from 'node:crypto'

export interface UniversityHireRequestProps {
  id?: string
  companyName: string
  contactName: string
  contactRole?: string | null
  email: string
  phone: string
  industry: string
  city: string
  placementType: string // INTERNSHIP | FULL_TIME | PART_TIME | CONTRACT
  rolesNeeded: string[] // e.g. ["Property Management", "Sales & Brokerage"]
  openingsCount: string
  compensationType?: string | null // PAID_STIPEND | SALARY | COMMISSION | NEGOTIABLE
  startDate?: string | null
  jobDescription?: string | null
  sourceIdentifier?: string | null
  abVariant?: string | null
  status: string // PENDING | CONTACTED | MATCHED | CLOSED
  notes?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class UniversityHireRequest {
  private constructor(private readonly props: UniversityHireRequestProps) {
    this.validate()
  }

  static create(props: Omit<UniversityHireRequestProps, 'createdAt' | 'updatedAt'>): UniversityHireRequest {
    return new UniversityHireRequest({
      ...props,
      id: props.id || randomUUID(),
      rolesNeeded: props.rolesNeeded || [],
      openingsCount: props.openingsCount || '1',
      status: props.status || 'PENDING',
      abVariant: props.abVariant || 'A',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(props: UniversityHireRequestProps): UniversityHireRequest {
    return new UniversityHireRequest(props)
  }

  private validate(): void {
    if (!this.props.companyName || this.props.companyName.trim().length === 0) {
      throw new Error('Company name is required')
    }
    if (!this.props.contactName || this.props.contactName.trim().length === 0) {
      throw new Error('Contact person name is required')
    }
    if (!this.props.email || this.props.email.trim().length === 0) {
      throw new Error('Email is required')
    }
    if (!this.props.phone || this.props.phone.trim().length === 0) {
      throw new Error('Phone number is required')
    }
    if (!this.props.industry || this.props.industry.trim().length === 0) {
      throw new Error('Industry is required')
    }
    if (!this.props.city || this.props.city.trim().length === 0) {
      throw new Error('City is required')
    }
    if (!this.props.placementType || this.props.placementType.trim().length === 0) {
      throw new Error('Placement type is required')
    }
  }

  get id(): string | undefined {
    return this.props.id
  }
  get companyName(): string {
    return this.props.companyName
  }
  get contactName(): string {
    return this.props.contactName
  }
  get contactRole(): string | null | undefined {
    return this.props.contactRole
  }
  get email(): string {
    return this.props.email
  }
  get phone(): string {
    return this.props.phone
  }
  get industry(): string {
    return this.props.industry
  }
  get city(): string {
    return this.props.city
  }
  get placementType(): string {
    return this.props.placementType
  }
  get rolesNeeded(): string[] {
    return this.props.rolesNeeded
  }
  get openingsCount(): string {
    return this.props.openingsCount
  }
  get compensationType(): string | null | undefined {
    return this.props.compensationType
  }
  get startDate(): string | null | undefined {
    return this.props.startDate
  }
  get jobDescription(): string | null | undefined {
    return this.props.jobDescription
  }
  get sourceIdentifier(): string | null | undefined {
    return this.props.sourceIdentifier
  }
  get abVariant(): string | null | undefined {
    return this.props.abVariant
  }
  get status(): string {
    return this.props.status
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

  updateStatus(status: string, notes?: string): void {
    this.props.status = status
    if (notes !== undefined) {
      this.props.notes = notes
    }
    this.props.updatedAt = new Date()
  }

  toObject(): UniversityHireRequestProps {
    return { ...this.props }
  }
}
