import { Injectable, Logger, Inject } from '@nestjs/common'
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  SESSION_TRACKING_REPOSITORY,
  ISessionTrackingRepository,
  UpsertSessionData,
  CreateSessionEventData,
} from '../../../domains/session-tracking/session-tracking.repository'

export class SessionContextDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string

  @IsNotEmpty()
  @IsString()
  anonymousId!: string

  @IsOptional()
  @IsNumber()
  userId?: number

  @IsOptional()
  @IsString()
  userEmail?: string

  @IsOptional()
  @IsString()
  userRole?: string

  @IsOptional()
  @IsString()
  app?: string

  @IsNotEmpty()
  @IsString()
  platform!: string

  @IsOptional()
  @IsString()
  clientType?: string

  // Geographic & Network Location
  @IsOptional()
  @IsString()
  ipAddress?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  countryCode?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  locale?: string

  @IsOptional()
  @IsString()
  networkType?: string

  // Acquisition & Referral
  @IsOptional()
  @IsString()
  landingPage?: string

  @IsOptional()
  @IsString()
  referrer?: string

  @IsOptional()
  @IsString()
  utmSource?: string

  @IsOptional()
  @IsString()
  utmMedium?: string

  @IsOptional()
  @IsString()
  utmCampaign?: string

  // Device & Screen
  @IsOptional()
  @IsString()
  deviceModel?: string

  @IsOptional()
  @IsString()
  osVersion?: string

  @IsOptional()
  @IsString()
  browser?: string

  @IsOptional()
  @IsNumber()
  screenWidth?: number

  @IsOptional()
  @IsNumber()
  screenHeight?: number

  @IsOptional()
  @IsString()
  entryScreen?: string
}

export class SessionEventDto {
  @IsNotEmpty()
  @IsString()
  eventName!: string

  @IsOptional()
  @IsString()
  screenName?: string

  @IsNotEmpty()
  @IsNumber()
  stepNumber!: number

  @IsOptional()
  metadata?: any

  @IsNotEmpty()
  clientTimestamp!: string | Date
}

export class IngestSessionEventsDto {
  @ValidateNested()
  @Type(() => SessionContextDto)
  session!: SessionContextDto

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventDto)
  events!: SessionEventDto[]
}

@Injectable()
export class IngestSessionEventsUseCase {
  private readonly logger = new Logger(IngestSessionEventsUseCase.name)

  constructor(
    @Inject(SESSION_TRACKING_REPOSITORY)
    private readonly sessionRepo: ISessionTrackingRepository,
  ) {}

  async execute(
    dto: IngestSessionEventsDto,
    headers: Record<string, any> = {},
    clientIp?: string,
  ): Promise<{ success: boolean; sessionId: string; eventsIngested: number }> {
    try {
      const s = dto.session
      if (!s || !s.sessionId) {
        return { success: false, sessionId: '', eventsIngested: 0 }
      }

      // 1. Resolve Geographic & Network Telemetry from Cloudflare / Vercel / Client
      const country =
        s.country || headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || 'Nigeria'
      const countryCode =
        s.countryCode || headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || 'NG'
      const region =
        s.region || headers['cf-region'] || headers['x-vercel-ip-country-region'] || null
      const city = s.city || headers['cf-ipcity'] || headers['x-vercel-ip-city'] || null
      const timezone =
        s.timezone || headers['cf-timezone'] || headers['x-vercel-ip-timezone'] || 'Africa/Lagos'
      const ipAddress =
        clientIp || s.ipAddress || headers['x-forwarded-for']?.split(',')[0]?.trim() || null

      // 2. Classify Drop-off Stage and Status from events
      let detectedDropOffStage: string | undefined = undefined
      let hasError = false
      let lastError: string | undefined = undefined
      let lastAction = s.entryScreen || 'APP_OPEN'
      let exitScreen = s.entryScreen || 'DASHBOARD'

      if (dto.events && dto.events.length > 0) {
        const lastEvt = dto.events[dto.events.length - 1]
        if (lastEvt) {
          lastAction = lastEvt.eventName
          if (lastEvt.screenName) exitScreen = lastEvt.screenName
        }

        for (const evt of dto.events) {
          if (evt.eventName === 'PAYSTACK_CLOSED_UNPAID' || evt.eventName === 'PAYMENT_ABANDONED') {
            detectedDropOffStage = 'PAYMENT_ABANDONED'
          } else if (evt.eventName === 'PAYMENT_ERROR') {
            detectedDropOffStage = 'PAYMENT_FAILED'
            hasError = true
            lastError = evt.metadata?.error || 'Payment transaction failed'
          } else if (evt.eventName === 'PAYMENT_SUCCESS') {
            detectedDropOffStage = 'COMPLETED'
          } else if (evt.eventName === 'AUTH_FAILED' || evt.eventName === 'LOGIN_FAILED') {
            detectedDropOffStage = 'AUTH_DROPOFF'
            hasError = true
            lastError = evt.metadata?.error || 'Authentication error'
          } else if (evt.eventName === 'KYC_FAILED') {
            detectedDropOffStage = 'KYC_DROPOFF'
            hasError = true
          }
        }
      }

      // 3. Upsert Session via Domain Repository
      const sessionData: UpsertSessionData = {
        sessionId: s.sessionId,
        anonymousId: s.anonymousId || s.sessionId,
        userId: s.userId || null,
        userEmail: s.userEmail || null,
        userRole: s.userRole || 'GUEST',
        app: s.app || 'upward-pay',
        platform: s.platform || 'web',
        clientType: s.clientType || 'browser',
        ipAddress,
        country,
        countryCode,
        region,
        city,
        timezone,
        locale: s.locale || 'en-NG',
        networkType: s.networkType || '4g',
        landingPage: s.landingPage || null,
        referrer: s.referrer || null,
        utmSource: s.utmSource || null,
        utmMedium: s.utmMedium || null,
        utmCampaign: s.utmCampaign || null,
        deviceModel: s.deviceModel || null,
        osVersion: s.osVersion || null,
        browser: s.browser || null,
        screenWidth: s.screenWidth || null,
        screenHeight: s.screenHeight || null,
        entryScreen: s.entryScreen || exitScreen,
        exitScreen,
        lastAction,
        dropOffStage: detectedDropOffStage || 'ACTIVE',
        hasError,
        lastError: lastError || null,
        eventsCount: dto.events ? dto.events.length : 0,
      }

      const session = await this.sessionRepo.upsertSession(sessionData)

      // 4. Batch Insert Events via Domain Repository
      if (dto.events && dto.events.length > 0) {
        const eventsData: CreateSessionEventData[] = dto.events.map((evt) => ({
          sessionId: s.sessionId,
          userId: s.userId || session.userId || null,
          eventName: evt.eventName,
          screenName: evt.screenName || null,
          stepNumber: evt.stepNumber || 1,
          metadata: evt.metadata ? JSON.parse(JSON.stringify(evt.metadata)) : null,
          clientTimestamp: new Date(evt.clientTimestamp || Date.now()),
        }))

        await this.sessionRepo.saveEvents(eventsData)
      }

      return {
        success: true,
        sessionId: s.sessionId,
        eventsIngested: dto.events ? dto.events.length : 0,
      }
    } catch (err: any) {
      this.logger.error(`Failed to ingest session events: ${err?.message || err}`, err?.stack)
      return { success: false, sessionId: dto.session?.sessionId || '', eventsIngested: 0 }
    }
  }
}
