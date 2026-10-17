export interface AppSessionProps {
  id?: number
  sessionId: string
  anonymousId: string
  userId?: number | null
  userEmail?: string | null
  userRole?: string | null
  app: string
  platform: string
  clientType: string

  // Geographic & Network Location
  ipAddress?: string | null
  country?: string | null
  countryCode?: string | null
  region?: string | null
  city?: string | null
  timezone?: string | null
  locale?: string | null
  networkType?: string | null

  // Acquisition & Referral
  landingPage?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null

  // Device & Screen
  deviceModel?: string | null
  osVersion?: string | null
  browser?: string | null
  screenWidth?: number | null
  screenHeight?: number | null

  // Lifecycle & Drop-off Diagnostics
  startedAt: Date
  endedAt?: Date | null
  durationSeconds: number
  entryScreen?: string | null
  exitScreen?: string | null
  lastAction?: string | null
  dropOffStage?: string | null
  hasError: boolean
  lastError?: string | null
  eventsCount: number
  events?: SessionEventProps[]

  createdAt: Date
  updatedAt: Date
}

export class AppSession {
  constructor(private readonly props: AppSessionProps) {}

  get events(): SessionEventProps[] | undefined {
    return this.props.events
  }

  get id(): number | undefined {
    return this.props.id
  }

  get sessionId(): string {
    return this.props.sessionId
  }

  get anonymousId(): string {
    return this.props.anonymousId
  }

  get userId(): number | null | undefined {
    return this.props.userId
  }

  get userEmail(): string | null | undefined {
    return this.props.userEmail
  }

  get userRole(): string | null | undefined {
    return this.props.userRole
  }

  get app(): string {
    return this.props.app
  }

  get platform(): string {
    return this.props.platform
  }

  get clientType(): string {
    return this.props.clientType
  }

  get ipAddress(): string | null | undefined {
    return this.props.ipAddress
  }

  get country(): string | null | undefined {
    return this.props.country
  }

  get countryCode(): string | null | undefined {
    return this.props.countryCode
  }

  get region(): string | null | undefined {
    return this.props.region
  }

  get city(): string | null | undefined {
    return this.props.city
  }

  get timezone(): string | null | undefined {
    return this.props.timezone
  }

  get locale(): string | null | undefined {
    return this.props.locale
  }

  get networkType(): string | null | undefined {
    return this.props.networkType
  }

  get landingPage(): string | null | undefined {
    return this.props.landingPage
  }

  get referrer(): string | null | undefined {
    return this.props.referrer
  }

  get utmSource(): string | null | undefined {
    return this.props.utmSource
  }

  get utmMedium(): string | null | undefined {
    return this.props.utmMedium
  }

  get utmCampaign(): string | null | undefined {
    return this.props.utmCampaign
  }

  get deviceModel(): string | null | undefined {
    return this.props.deviceModel
  }

  get osVersion(): string | null | undefined {
    return this.props.osVersion
  }

  get browser(): string | null | undefined {
    return this.props.browser
  }

  get screenWidth(): number | null | undefined {
    return this.props.screenWidth
  }

  get screenHeight(): number | null | undefined {
    return this.props.screenHeight
  }

  get startedAt(): Date {
    return this.props.startedAt
  }

  get endedAt(): Date | null | undefined {
    return this.props.endedAt
  }

  get durationSeconds(): number {
    return this.props.durationSeconds
  }

  get entryScreen(): string | null | undefined {
    return this.props.entryScreen
  }

  get exitScreen(): string | null | undefined {
    return this.props.exitScreen
  }

  get lastAction(): string | null | undefined {
    return this.props.lastAction
  }

  get dropOffStage(): string | null | undefined {
    return this.props.dropOffStage
  }

  get hasError(): boolean {
    return this.props.hasError
  }

  get lastError(): string | null | undefined {
    return this.props.lastError
  }

  get eventsCount(): number {
    return this.props.eventsCount
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  toJSON() {
    return { ...this.props }
  }
}

export interface SessionEventProps {
  id?: number
  sessionId: string
  userId?: number | null
  eventName: string
  screenName?: string | null
  stepNumber: number
  metadata?: any
  clientTimestamp: Date
  createdAt: Date
}

export class SessionEvent {
  constructor(private readonly props: SessionEventProps) {}

  get id(): number | undefined {
    return this.props.id
  }

  get sessionId(): string {
    return this.props.sessionId
  }

  get userId(): number | null | undefined {
    return this.props.userId
  }

  get eventName(): string {
    return this.props.eventName
  }

  get screenName(): string | null | undefined {
    return this.props.screenName
  }

  get stepNumber(): number {
    return this.props.stepNumber
  }

  get metadata(): any {
    return this.props.metadata
  }

  get clientTimestamp(): Date {
    return this.props.clientTimestamp
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  toJSON() {
    return { ...this.props }
  }
}
