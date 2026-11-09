import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  ISessionTrackingRepository,
  UpsertSessionData,
  CreateSessionEventData,
  EndSessionData,
  FunnelMetricsQuery,
  FunnelMetricsResult,
  FindSessionsQuery,
} from '../../../../domains/session-tracking/session-tracking.repository'
import { AppSession, SessionEvent } from '../../../../domains/session-tracking/session-tracking.entity'

@Injectable()
export class PrismaSessionTrackingRepository implements ISessionTrackingRepository {
  private readonly logger = new Logger(PrismaSessionTrackingRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  private toDomainSession(record: any): AppSession {
    return new AppSession({
      id: record.id,
      sessionId: record.sessionId,
      anonymousId: record.anonymousId,
      userId: record.userId,
      userEmail: record.userEmail,
      userRole: record.userRole,
      app: record.app,
      platform: record.platform,
      clientType: record.clientType,
      ipAddress: record.ipAddress,
      country: record.country,
      countryCode: record.countryCode,
      region: record.region,
      city: record.city,
      timezone: record.timezone,
      locale: record.locale,
      networkType: record.networkType,
      landingPage: record.landingPage,
      referrer: record.referrer,
      utmSource: record.utmSource,
      utmMedium: record.utmMedium,
      utmCampaign: record.utmCampaign,
      deviceModel: record.deviceModel,
      osVersion: record.osVersion,
      browser: record.browser,
      screenWidth: record.screenWidth,
      screenHeight: record.screenHeight,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      durationSeconds: record.durationSeconds,
      entryScreen: record.entryScreen,
      exitScreen: record.exitScreen,
      lastAction: record.lastAction,
      dropOffStage: record.dropOffStage,
      hasError: record.hasError,
      lastError: record.lastError,
      eventsCount: record.eventsCount,
      events: record.events ? record.events.map((e: any) => ({ ...e })) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }

  private toDomainEvent(record: any): SessionEvent {
    return new SessionEvent({
      id: record.id,
      sessionId: record.sessionId,
      userId: record.userId,
      eventName: record.eventName,
      screenName: record.screenName,
      stepNumber: record.stepNumber,
      metadata: record.metadata,
      clientTimestamp: record.clientTimestamp,
      createdAt: record.createdAt,
    })
  }

  async upsertSession(data: UpsertSessionData): Promise<AppSession> {
    const record = await (this.prisma as any).upward_user_session.upsert({
      where: { sessionId: data.sessionId },
      create: {
        sessionId: data.sessionId,
        anonymousId: data.anonymousId,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userRole: data.userRole || 'GUEST',
        app: data.app || 'upward-pay',
        platform: data.platform,
        clientType: data.clientType || 'browser',
        ipAddress: data.ipAddress || null,
        country: data.country || null,
        countryCode: data.countryCode || null,
        region: data.region || null,
        city: data.city || null,
        timezone: data.timezone || null,
        locale: data.locale || null,
        networkType: data.networkType || null,
        landingPage: data.landingPage || null,
        referrer: data.referrer || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        deviceModel: data.deviceModel || null,
        osVersion: data.osVersion || null,
        browser: data.browser || null,
        screenWidth: data.screenWidth || null,
        screenHeight: data.screenHeight || null,
        entryScreen: data.entryScreen || data.exitScreen || null,
        exitScreen: data.exitScreen || null,
        lastAction: data.lastAction || null,
        dropOffStage: data.dropOffStage || 'ACTIVE',
        hasError: data.hasError || false,
        lastError: data.lastError || null,
        eventsCount: data.eventsCount || 0,
      },
      update: {
        ...(data.userId ? { userId: data.userId } : {}),
        ...(data.userEmail ? { userEmail: data.userEmail } : {}),
        ...(data.userRole ? { userRole: data.userRole } : {}),
        ...(data.exitScreen ? { exitScreen: data.exitScreen } : {}),
        ...(data.lastAction ? { lastAction: data.lastAction } : {}),
        ...(data.dropOffStage ? { dropOffStage: data.dropOffStage } : {}),
        ...(data.hasError !== undefined ? { hasError: data.hasError, lastError: data.lastError } : {}),
        ...(data.eventsCount ? { eventsCount: { increment: data.eventsCount } } : {}),
        updatedAt: new Date(),
      },
    })

    return this.toDomainSession(record)
  }

  async saveEvents(events: CreateSessionEventData[]): Promise<void> {
    if (!events || events.length === 0) return

    const data = events.map((e) => ({
      sessionId: e.sessionId,
      userId: e.userId || null,
      eventName: e.eventName,
      screenName: e.screenName || null,
      stepNumber: e.stepNumber,
      metadata: e.metadata ? JSON.parse(JSON.stringify(e.metadata)) : null,
      clientTimestamp: e.clientTimestamp,
    }))

    await (this.prisma as any).upward_user_session_event.createMany({
      data,
    })
  }

  async endSession(sessionId: string, data: EndSessionData): Promise<boolean> {
    try {
      await (this.prisma as any).upward_user_session.update({
        where: { sessionId },
        data: {
          endedAt: data.endedAt,
          durationSeconds: data.durationSeconds,
          exitScreen: data.exitScreen || undefined,
          lastAction: data.lastAction || undefined,
          dropOffStage: data.dropOffStage || undefined,
          updatedAt: new Date(),
        },
      })
      return true
    } catch (err: any) {
      this.logger.warn(`Could not end session ${sessionId}: ${err?.message || err}`)
      return false
    }
  }

  async findSessionBySessionId(sessionId: string): Promise<AppSession | null> {
    const record = await (this.prisma as any).upward_user_session.findUnique({
      where: { sessionId },
    })
    if (!record) return null
    return this.toDomainSession(record)
  }

  async getFunnelMetrics(query: FunnelMetricsQuery): Promise<FunnelMetricsResult> {
    const days = query.days ? Number(query.days) : 30
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const where: any = {
      startedAt: { gte: sinceDate },
    }

    if (query.platform && query.platform !== 'ALL') {
      where.platform = query.platform
    }

    if (query.app && query.app !== 'ALL') {
      where.app = query.app
    }

    const [totalSessions, dropOffGrouped, platformGrouped, geoGrouped] = await Promise.all([
      (this.prisma as any).upward_user_session.count({ where }),
      (this.prisma as any).upward_user_session.groupBy({
        by: ['dropOffStage'],
        where,
        _count: true,
      }),
      (this.prisma as any).upward_user_session.groupBy({
        by: ['platform'],
        where,
        _count: true,
      }),
      (this.prisma as any).upward_user_session.groupBy({
        by: ['city', 'countryCode'],
        where: {
          ...where,
          city: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            city: 'desc',
          },
        },
        take: 10,
      }),
    ])

    const paymentFunnelEvents = [
      'VIEW_DASHBOARD',
      'CLICK_PAY_RENT',
      'OPEN_CHECKOUT_MODAL',
      'INITIATE_PAYSTACK',
      'PAYMENT_SUCCESS',
    ]

    const eventCounts = await (this.prisma as any).upward_user_session_event.groupBy({
      by: ['eventName'],
      where: {
        createdAt: { gte: sinceDate },
        eventName: { in: [...paymentFunnelEvents, 'PAYSTACK_CLOSED_UNPAID', 'PAYMENT_ERROR'] },
      },
      _count: true,
    })

    const countMap: Record<string, number> = {}
    eventCounts.forEach((ec: any) => {
      countMap[ec.eventName] = ec._count
    })

    const baseDashboard = Math.max(countMap['VIEW_DASHBOARD'] || 0, totalSessions)
    const clickPay = countMap['CLICK_PAY_RENT'] || 0
    const openCheckout = countMap['OPEN_CHECKOUT_MODAL'] || 0
    const initPaystack = countMap['INITIATE_PAYSTACK'] || 0
    const paySuccess = countMap['PAYMENT_SUCCESS'] || 0
    const payDismissed = countMap['PAYSTACK_CLOSED_UNPAID'] || 0
    const payError = countMap['PAYMENT_ERROR'] || 0

    const paymentFunnelSteps = [
      {
        step: 1,
        name: 'View Dashboard / Rent',
        count: baseDashboard,
        conversionRate: baseDashboard > 0 ? 100 : 0,
        dropOffCount: Math.max(0, baseDashboard - clickPay),
        dropOffRate: baseDashboard > 0 ? Number(((Math.max(0, baseDashboard - clickPay) / baseDashboard) * 100).toFixed(1)) : 0,
      },
      {
        step: 2,
        name: 'Initiated Rent Flow',
        count: clickPay,
        conversionRate: baseDashboard > 0 ? Number(((clickPay / baseDashboard) * 100).toFixed(1)) : 0,
        dropOffCount: Math.max(0, clickPay - openCheckout),
        dropOffRate: clickPay > 0 ? Number(((Math.max(0, clickPay - openCheckout) / clickPay) * 100).toFixed(1)) : 0,
      },
      {
        step: 3,
        name: 'Entered Checkout Modal',
        count: openCheckout,
        conversionRate: baseDashboard > 0 ? Number(((openCheckout / baseDashboard) * 100).toFixed(1)) : 0,
        dropOffCount: Math.max(0, openCheckout - initPaystack),
        dropOffRate: openCheckout > 0 ? Number(((Math.max(0, openCheckout - initPaystack) / openCheckout) * 100).toFixed(1)) : 0,
      },
      {
        step: 4,
        name: 'Opened Paystack Gateway',
        count: initPaystack,
        conversionRate: baseDashboard > 0 ? Number(((initPaystack / baseDashboard) * 100).toFixed(1)) : 0,
        dropOffCount: Math.max(0, initPaystack - paySuccess),
        dropOffRate: initPaystack > 0 ? Number(((Math.max(0, initPaystack - paySuccess) / initPaystack) * 100).toFixed(1)) : 0,
      },
      {
        step: 5,
        name: 'Payment Completed',
        count: paySuccess,
        conversionRate: baseDashboard > 0 ? Number(((paySuccess / baseDashboard) * 100).toFixed(1)) : 0,
        dropOffCount: 0,
        dropOffRate: 0,
      },
    ]

    return {
      totalSessions,
      paymentFunnel: {
        steps: paymentFunnelSteps,
        leakage: {
          dismissedWithoutPaying: payDismissed,
          failedWithErrors: payError,
        },
      },
      dropOffBreakdown: dropOffGrouped.map((d: any) => ({
        stage: d.dropOffStage || 'UNKNOWN',
        count: d._count,
      })),
      platformBreakdown: platformGrouped.map((p: any) => ({
        platform: p.platform,
        count: p._count,
      })),
      topLocations: geoGrouped.map((g: any) => ({
        city: g.city || 'Unknown City',
        countryCode: g.countryCode || 'NG',
        count: g._count,
      })),
    }
  }

  async findSessions(query: FindSessionsQuery): Promise<{ data: AppSession[]; total: number }> {
    const pageNum = query.page || 1
    const limitNum = query.limit || 30
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    const andConditions: any[] = []

    if (query.platform && query.platform !== 'ALL') {
      andConditions.push({ platform: query.platform })
    }

    if (query.dropOffStage && query.dropOffStage !== 'ALL') {
      andConditions.push({ dropOffStage: query.dropOffStage })
    }

    if (query.hasError) {
      andConditions.push({ hasError: true })
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim()
      andConditions.push({
        OR: [
          { userEmail: { contains: s, mode: 'insensitive' } },
          { city: { contains: s, mode: 'insensitive' } },
          { deviceModel: { contains: s, mode: 'insensitive' } },
          { lastAction: { contains: s, mode: 'insensitive' } },
          { exitScreen: { contains: s, mode: 'insensitive' } },
          { sessionId: { contains: s, mode: 'insensitive' } },
        ],
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const [records, total] = await Promise.all([
      (this.prisma as any).upward_user_session.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { startedAt: 'desc' },
        include: {
          events: {
            take: 5,
            orderBy: { stepNumber: 'desc' },
          },
        },
      }),
      (this.prisma as any).upward_user_session.count({ where }),
    ])

    return {
      data: records.map((r: any) => this.toDomainSession(r)),
      total,
    }
  }

  async findSessionWithEvents(sessionId: string): Promise<{ session: AppSession; events: SessionEvent[] } | null> {
    const record = await (this.prisma as any).upward_user_session.findUnique({
      where: { sessionId },
      include: {
        events: {
          orderBy: [{ clientTimestamp: 'asc' }, { id: 'asc' }],
        },
      },
    })

    if (!record) return null

    return {
      session: this.toDomainSession(record),
      events: (record.events || []).map((e: any) => this.toDomainEvent(e)),
    }
  }
}
