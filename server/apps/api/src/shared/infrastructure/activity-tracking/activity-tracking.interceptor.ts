import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { ActivityTrackingService } from './activity-tracking.service'

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  constructor(private readonly trackingService: ActivityTrackingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp()
    const req = httpContext.getRequest()

    // Fastify/Express request details
    const method = req.method
    const url = req.url || ''

    // Ignore admin routes completely (admin actions are not tenant telemetry)
    if (url.startsWith('/admin') || url.includes('/admin/')) {
      return next.handle()
    }

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isAuth = url.includes('/auth/')

    // We only track mutations (CUD) and auth endpoints (login, signup, logout)
    if (!isMutation && !isAuth) {
      return next.handle()
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.processTracking(req, method, url, responseBody, false)
        },
        error: (err) => {
          // Omit failed logins due to token refreshes (routine expired/missing cookie background checks)
          if (isAuth && !url.includes('/refresh') && !url.includes('refresh-token')) {
            this.processTracking(req, method, url, err, true)
          }
        },
      }),
    )
  }

  private processTracking(req: any, method: string, url: string, payload: any, isError: boolean) {
    // Never track failed token refreshes as LOGIN_FAILED
    if (isError && (url.includes('/refresh') || url.includes('refresh-token'))) {
      return
    }
    try {
      // Extract user/session details
      const user = req.user || req.raw?.user
      const authResult = (req as any).authResult || req.raw?.authResult

      let userUuid = user?.sub || authResult?.user?.uuid || payload?.user?.uuid
      let userEmail = user?.email || authResult?.user?.email || payload?.user?.email
      let userRole = user?.role || authResult?.user?.role || payload?.user?.role || 'TENANT'

      if (!user && !authResult?.user) {
        userRole = 'GUEST'
      }

      // Determine application based on URL prefix or user role
      let app = 'upward-pay' // Default to pay (tenant app)
      if (url.includes('/pm/') || url.includes('/landlord/') || userRole === 'PM') {
        app = 'upward-pm'
      }

      // Handle guest login/signup or unauthenticated requests where req.user is not yet populated
      if (!userEmail) {
        userEmail =
          authResult?.user?.email ||
          authResult?.email ||
          payload?.user?.email ||
          payload?.data?.user?.email ||
          payload?.profile?.email ||
          payload?.data?.profile?.email ||
          (typeof req.body?.email === 'string' && req.body.email.includes('@')
            ? req.body.email.trim()
            : undefined) ||
          (typeof req.body?.identifier === 'string' && req.body.identifier.includes('@')
            ? req.body.identifier.trim()
            : undefined)
      }

      if (!userUuid) {
        userUuid =
          authResult?.user?.uuid ||
          authResult?.user?.id?.toString() ||
          payload?.user?.uuid ||
          payload?.user?.id?.toString() ||
          payload?.data?.user?.uuid ||
          payload?.profile?.uuid ||
          payload?.data?.profile?.uuid ||
          undefined
      }

      if (userEmail && (!userRole || userRole === 'GUEST')) {
        userRole = app === 'upward-pm' ? 'PM' : 'TENANT'
      }

      const rawProvider =
        req.body?.provider ||
        authResult?.user?.authProvider ||
        payload?.user?.authProvider ||
        payload?.authProvider
      const authProvider = typeof rawProvider === 'string' ? rawProvider.toLowerCase() : undefined

      // Determine Action
      let action = method
      if (isError) {
        action = url.includes('signup') ? 'SIGNUP_FAILED' : 'LOGIN_FAILED'
      } else if (authResult?.isNewUser !== undefined) {
        action = authResult.isNewUser ? 'SIGNUP' : 'LOGIN'
      } else if (payload?.isNewUser !== undefined) {
        action = payload.isNewUser ? 'SIGNUP' : 'LOGIN'
      } else if (url.includes('social') || url.includes('/auth/social')) {
        action = payload?.isNewUser ? 'SIGNUP' : 'LOGIN'
      } else if (url.includes('login')) {
        action = 'LOGIN'
      } else if (
        url.includes('signup') ||
        url.includes('complete-profile') ||
        url.includes('/accept')
      ) {
        action = 'SIGNUP'
      } else if (url.includes('logout')) {
        action = 'LOGOUT'
      } else {
        action = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE'
      }

      // Extract Entity details and Description
      const parsedUrl = new URL(url, 'http://localhost')
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

      // Find the index of app context prefix (like pm or user)
      const appIndex = pathSegments.findIndex((s) => s === 'pm' || s === 'user' || s === 'public')
      const cleanSegments = appIndex !== -1 ? pathSegments.slice(appIndex + 1) : pathSegments

      let entityType = cleanSegments[0]?.toUpperCase() || 'UNKNOWN'
      // Singularize / Clean entity type
      if (entityType.endsWith('IES')) {
        entityType = entityType.replace(/IES$/, 'Y')
      } else if (entityType.endsWith('S') && !entityType.endsWith('SS')) {
        entityType = entityType.slice(0, -1)
      }

      // Extract EntityId from params or body or payload
      let entityId =
        req.params?.id ||
        req.params?.uuid ||
        req.params?.unitUuid ||
        req.params?.propertyUuid ||
        req.params?.paymentUuid
      if (!entityId && cleanSegments[1]) {
        const secondSegment = cleanSegments[1]
        if (secondSegment.length > 5 || secondSegment.match(/^[0-9]+$/)) {
          entityId = secondSegment
        }
      }
      if (!entityId && payload) {
        entityId = payload.uuid || payload.id?.toString()
      }

      const rawHeaderPlatform = (req.headers['x-client-platform'] || '').toLowerCase()
      const rawUserAgent = req.headers['user-agent'] || ''
      const isNativeMobile =
        ['capacitor', 'ios', 'android'].includes(rawHeaderPlatform) ||
        /capacitor/i.test(rawUserAgent)

      let platform: 'ios' | 'android' | 'web' = 'web'
      if (
        rawHeaderPlatform === 'ios' ||
        (/iphone|ipad|ipod/i.test(rawUserAgent) && isNativeMobile)
      ) {
        platform = 'ios'
      } else if (
        rawHeaderPlatform === 'android' ||
        (/android/i.test(rawUserAgent) && isNativeMobile)
      ) {
        platform = 'android'
      } else if (rawHeaderPlatform === 'capacitor') {
        platform = /iphone|ipad|ipod/i.test(rawUserAgent) ? 'ios' : 'android'
      } else if (/iphone|ipad|ipod/i.test(rawUserAgent)) {
        platform = 'ios'
      } else if (/android/i.test(rawUserAgent)) {
        platform = 'android'
      } else {
        platform = 'web'
      }

      let deviceName = 'Unknown Device'
      if (/iphone/i.test(rawUserAgent)) {
        deviceName = 'iPhone'
      } else if (/ipad/i.test(rawUserAgent)) {
        deviceName = 'iPad'
      } else if (/android/i.test(rawUserAgent)) {
        const modelMatch = rawUserAgent.match(/;\s*([^;)]+)\s+Build/i)
        deviceName = modelMatch && modelMatch[1] ? modelMatch[1].trim() : 'Android Device'
      } else if (/macintosh|mac os x/i.test(rawUserAgent)) {
        deviceName = 'Mac'
      } else if (/windows/i.test(rawUserAgent)) {
        deviceName = 'Windows PC'
      } else if (/linux/i.test(rawUserAgent)) {
        deviceName = 'Linux PC'
      }

      let browserName = 'Browser'
      if (isNativeMobile) {
        browserName = platform === 'ios' ? 'Upward iOS App' : 'Upward Android App'
      } else if (/edg/i.test(rawUserAgent)) {
        browserName = 'Edge'
      } else if (/chrome|crios/i.test(rawUserAgent)) {
        browserName = 'Chrome'
      } else if (/firefox|fxios/i.test(rawUserAgent)) {
        browserName = 'Firefox'
      } else if (/safari/i.test(rawUserAgent)) {
        browserName = 'Safari'
      }

      let userAgent = rawUserAgent
      if (isNativeMobile && !userAgent.toLowerCase().includes('capacitor')) {
        userAgent = userAgent ? `${userAgent} Capacitor` : 'Capacitor'
      }

      const clientPlatform = isNativeMobile ? platform : 'web'

      // Scrub sensitive metadata from request payload
      const metadata = this.scrubMetadata({
        body: req.body,
        query: req.query,
        params: req.params,
        clientPlatform,
        platform,
        isNativeMobile,
        device: deviceName,
        browser: browserName,
        provider: authProvider,
        authProvider,
      })

      if (isError) {
        metadata.error = payload?.message || payload?.error || 'Authentication error'
        metadata.statusCode = payload?.status || payload?.statusCode || 401
      }

      const ipAddress = req.ip || req.raw?.ip
      const platformLabel = isNativeMobile
        ? `${platform.toUpperCase()} App (${deviceName})`
        : `Web (${browserName} on ${deviceName})`

      // Construct descriptive message & filter out noisy technical internal calls
      let description = ''
      let shouldRecord = true

      if (isError) {
        const providerLabel = authProvider
          ? ` (${authProvider === 'apple' ? 'Apple' : 'Google'} OAuth)`
          : ''
        const errorReason = payload?.message || payload?.error || 'Authentication error'
        description = `Tenant sign-in attempt failed${providerLabel} via ${platformLabel}: ${errorReason}`
        entityType = 'AUTH'
      } else if (action === 'LOGIN') {
        const providerLabel = authProvider
          ? ` (${authProvider === 'apple' ? 'Apple' : 'Google'} OAuth)`
          : ''
        description = `Tenant logged in${providerLabel} via ${platformLabel}`
        entityType = 'AUTH'
      } else if (action === 'SIGNUP') {
        let details = ''
        if (authProvider) {
          details = ` (${authProvider === 'apple' ? 'Apple' : 'Google'} OAuth)`
        } else if (req.body?.isFromInvite) {
          details = ' (Invited Tenant converted)'
        } else if (req.body?.isFromWaitlist) {
          details = ' (Waitlist converted)'
        } else {
          details = ' (Self-registered)'
        }
        description = `New tenant registered${details} via ${platformLabel}`
        entityType = 'AUTH'
      } else if (action === 'LOGOUT') {
        description = `Tenant logged out via ${platformLabel}`
        entityType = 'AUTH'
      } else if (
        url.includes('/payments/initialize') ||
        url.includes('/checkout') ||
        url.includes('/paystack/initialize')
      ) {
        action = 'PAYMENT'
        entityType = 'PAYMENT'
        const amt = req.body?.amount ? ` of ₦${Number(req.body.amount).toLocaleString()}` : ''
        description = `Initiated rent checkout${amt} via ${platformLabel}`
      } else if (url.includes('/payments/benefits/initialize')) {
        action = 'PAYMENT'
        entityType = 'BENEFITS'
        description = `Initiated benefits subscription checkout via ${platformLabel}`
      } else if (url.includes('/payments/rent-deposit/apply')) {
        action = 'PAYMENT'
        entityType = 'RENT_DEPOSIT'
        const amt = req.body?.amountToApply
          ? ` of ₦${Number(req.body.amountToApply).toLocaleString()}`
          : ''
        description = `Applied rent deposit${amt} toward rent via ${platformLabel}`
      } else if (url.includes('/deposit') || url.includes('/wallet')) {
        action = 'DEPOSIT'
        entityType = 'WALLET'
        const amt = req.body?.amount ? ` of ₦${Number(req.body.amount).toLocaleString()}` : ''
        description = `Initiated wallet deposit${amt} via ${platformLabel}`
      } else if (url.includes('/credibility')) {
        action = 'CREDIBILITY_REQUEST'
        entityType = 'REPORT'
        description = `Requested rental credibility report via ${platformLabel}`
      } else {
        // Drop generic internal technical mutations (e.g. "CREATE action on API", routine profile polls)
        shouldRecord = false
      }

      if (!shouldRecord) {
        return
      }

      // Emit the tracking event
      this.trackingService.track({
        app,
        userUuid,
        userRole,
        userEmail,
        action,
        entityType,
        entityId,
        description,
        metadata,
        ipAddress,
        userAgent,
      })
    } catch (err) {
      // Fail silently so we don't disrupt the request lifecycle
      console.error('Error in ActivityTrackingInterceptor:', err)
    }
  }

  private scrubMetadata(data: any): any {
    if (!data) return data
    const sensitiveKeys = [
      'password',
      'passwordPlain',
      'current',
      'new',
      'otp',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
    ]
    const clone = JSON.parse(JSON.stringify(data))

    const walk = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED]'
        } else if (typeof obj[key] === 'object') {
          walk(obj[key])
        }
      }
    }

    walk(clone)
    return clone
  }
}
