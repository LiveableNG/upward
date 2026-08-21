import { randomUUID } from 'node:crypto'

export type EarlyAccessType = 'STUDENT' | 'LANDLORD'

export interface EarlyAccessProps {
  id?: string
  type: EarlyAccessType
  name: string
  whatsapp: string
  email?: string | null
  city: string
  ageBracket?: string | null
  experienceLevel?: string | null
  interest?: string | null
  propertyCount?: string | null
  landlordStatus?: string | null
  managementStyle?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class EarlyAccessEntry {
  private constructor(private readonly props: EarlyAccessProps) {
    this.validate()
  }

  static create(props: Omit<EarlyAccessProps, 'createdAt' | 'updatedAt'>): EarlyAccessEntry {
    return new EarlyAccessEntry({
      ...props,
      id: props.id || randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(props: EarlyAccessProps): EarlyAccessEntry {
    return new EarlyAccessEntry(props)
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('Name is required')
    }
    if (!this.props.whatsapp || this.props.whatsapp.trim().length === 0) {
      throw new Error('WhatsApp contact is required')
    }
    if (!this.props.city || this.props.city.trim().length === 0) {
      throw new Error('City is required')
    }
  }

  get id(): string | undefined {
    return this.props.id
  }
  get type(): EarlyAccessType {
    return this.props.type
  }
  get name(): string {
    return this.props.name
  }
  get whatsapp(): string {
    return this.props.whatsapp
  }
  get email(): string | null | undefined {
    return this.props.email
  }
  get city(): string {
    return this.props.city
  }
  get ageBracket(): string | null | undefined {
    return this.props.ageBracket
  }
  get experienceLevel(): string | null | undefined {
    return this.props.experienceLevel
  }
  get interest(): string | null | undefined {
    return this.props.interest
  }
  get propertyCount(): string | null | undefined {
    return this.props.propertyCount
  }
  get landlordStatus(): string | null | undefined {
    return this.props.landlordStatus
  }
  get managementStyle(): string | null | undefined {
    return this.props.managementStyle
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  toObject(): EarlyAccessProps {
    return { ...this.props }
  }
}
