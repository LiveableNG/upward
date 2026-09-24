export interface UniversityTrafficSourceProps {
  id: string
  identifier: string
  name: string
  channel: string
  targetUrl: string
  description?: string | null
  totalViews: number
  uniqueViews: number
  conversions: number
  isActive: boolean
  lastVisitedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export class UniversityTrafficSource {
  constructor(private readonly props: UniversityTrafficSourceProps) {}

  get id(): string {
    return this.props.id
  }

  get identifier(): string {
    return this.props.identifier
  }

  get name(): string {
    return this.props.name
  }

  get channel(): string {
    return this.props.channel
  }

  get targetUrl(): string {
    return this.props.targetUrl
  }

  get description(): string | null | undefined {
    return this.props.description
  }

  get totalViews(): number {
    return this.props.totalViews
  }

  get uniqueViews(): number {
    return this.props.uniqueViews
  }

  get conversions(): number {
    return this.props.conversions
  }

  get isActive(): boolean {
    return this.props.isActive
  }

  get lastVisitedAt(): Date | null | undefined {
    return this.props.lastVisitedAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get conversionRate(): number {
    if (this.props.uniqueViews <= 0) return 0
    return Math.round((this.props.conversions / this.props.uniqueViews) * 10000) / 100
  }

  toObject() {
    return {
      id: this.props.id,
      identifier: this.props.identifier,
      name: this.props.name,
      channel: this.props.channel,
      targetUrl: this.props.targetUrl,
      description: this.props.description,
      totalViews: this.props.totalViews,
      uniqueViews: this.props.uniqueViews,
      conversions: this.props.conversions,
      conversionRate: this.conversionRate,
      isActive: this.props.isActive,
      lastVisitedAt: this.props.lastVisitedAt ? this.props.lastVisitedAt.toISOString() : null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}

export interface UniversityTrafficVisitProps {
  id: string
  sourceId?: string | null
  identifier: string
  visitorId: string
  sessionId: string
  abVariant?: string | null
  ipHash?: string | null
  userAgent?: string | null
  referer?: string | null
  path: string
  isUnique: boolean
  createdAt: Date
}

export class UniversityTrafficVisit {
  constructor(private readonly props: UniversityTrafficVisitProps) {}

  get id(): string {
    return this.props.id
  }

  get sourceId(): string | null | undefined {
    return this.props.sourceId
  }

  get identifier(): string {
    return this.props.identifier
  }

  get visitorId(): string {
    return this.props.visitorId
  }

  get sessionId(): string {
    return this.props.sessionId
  }

  get abVariant(): string | null | undefined {
    return this.props.abVariant
  }

  get ipHash(): string | null | undefined {
    return this.props.ipHash
  }

  get userAgent(): string | null | undefined {
    return this.props.userAgent
  }

  get referer(): string | null | undefined {
    return this.props.referer
  }

  get path(): string {
    return this.props.path
  }

  get isUnique(): boolean {
    return this.props.isUnique
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  toObject() {
    return {
      id: this.props.id,
      sourceId: this.props.sourceId,
      identifier: this.props.identifier,
      visitorId: this.props.visitorId,
      sessionId: this.props.sessionId,
      abVariant: this.props.abVariant || 'A',
      ipHash: this.props.ipHash,
      userAgent: this.props.userAgent,
      referer: this.props.referer,
      path: this.props.path,
      isUnique: this.props.isUnique,
      createdAt: this.props.createdAt.toISOString(),
    }
  }
}
