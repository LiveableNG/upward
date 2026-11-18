import { Injectable, Logger, Optional } from '@nestjs/common'
import { PrismaDeviceTokenRepository } from '../prisma/repositories/prisma-device-token.repository'

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name)

  private accessToken: string | null = null
  private tokenExpiresAt = 0

  constructor(
    @Optional()
    private readonly deviceTokenRepo?: PrismaDeviceTokenRepository,
  ) {}

  /**
   * Sanitizes string values from environment variables, stripping outer quotes and trimming whitespace.
   */
  private cleanEnvString(val?: string): string | null {
    if (!val) return null
    let cleaned = val.trim()
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim()
    }
    return cleaned || null
  }

  private get projectId(): string | null {
    return this.cleanEnvString(process.env.FCM_PROJECT_ID)
  }

  private get clientEmail(): string | null {
    return this.cleanEnvString(process.env.FCM_CLIENT_EMAIL)
  }

  /**
   * Sanitizes the private key from environment variables.
   * Handles surrounding quotes, literal escaped \n, \r, and multiline variations.
   */
  private getPrivateKey(): string | null {
    const raw = process.env.FCM_PRIVATE_KEY
    if (!raw) return null

    let cleaned = raw.trim()

    // 1. Strip surrounding double or single quotes added by cloud env editors (Vercel, AWS, Heroku)
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1)
    }

    // 2. Convert literal backslash-n string to real newlines
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '').trim()

    // 3. Second pass in case quotes were nested inside escaped strings
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1)
    }

    return cleaned.trim()
  }

  /** Obtain a short-lived OAuth2 token for FCM HTTP v1 */
  private async getAccessToken(): Promise<string | null> {
    const projectId = this.projectId
    const clientEmail = this.clientEmail
    const privateKey = this.getPrivateKey()

    if (!projectId || !clientEmail || !privateKey) return null
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return this.accessToken

    try {
      const { createSign } = await import('crypto')
      const now = Math.floor(Date.now() / 1000)
      const exp = now + 3600

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(
        JSON.stringify({
          iss: clientEmail,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp,
        }),
      ).toString('base64url')

      const sign = createSign('RSA-SHA256')
      sign.write(`${header}.${payload}`)
      sign.end()
      const sig = sign.sign(privateKey, 'base64url')
      const jwt = `${header}.${payload}.${sig}`

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`Google OAuth2 token exchange rejected: ${resp.status} ${errorText}`)
      }

      const json = (await resp.json()) as { access_token: string }
      this.accessToken = json.access_token
      this.tokenExpiresAt = exp * 1000
      return this.accessToken
    } catch (err) {
      this.logger.error('Failed to obtain FCM access token', err)
      throw err
    }
  }

  async convertApnsTokenToFcm(apnsToken: string, bundleId = 'com.goodtenants.upward'): Promise<string | null> {
    const accessToken = await this.getAccessToken()
    if (!accessToken) return null

    // Try production first (for App Store / TestFlight builds), then sandbox
    for (const sandbox of [false, true]) {
      try {
        const resp = await fetch('https://iid.googleapis.com/iid/v1:batchImport', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            access_token_auth: 'true',
          },
          body: JSON.stringify({
            application: bundleId,
            sandbox,
            apns_tokens: [apnsToken],
          }),
        })

        if (!resp.ok) continue
        const data = (await resp.json()) as {
          results?: Array<{ status: string; registration_token?: string; token?: string; apns_token?: string }>
        }
        const result = data?.results?.[0]
        const fcmToken = result?.registration_token || result?.token
        if (result?.status === 'OK' && fcmToken) {
          this.logger.log(`Successfully mapped APNs token to FCM token (sandbox=${sandbox})`)
          return fcmToken
        }
      } catch (err) {
        this.logger.warn(`Failed to import APNs token (sandbox=${sandbox})`, err)
      }
    }

    return null
  }

  /**
   * Dispatches push notifications to an array of FCM or APNs device tokens.
   * Returns { sent, failed } counts.
   */
  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ sent: number; failed: number }> {
    const projectId = this.projectId
    const clientEmail = this.clientEmail
    const privateKey = this.getPrivateKey()

    const missing: string[] = []
    if (!projectId) missing.push('FCM_PROJECT_ID')
    if (!clientEmail) missing.push('FCM_CLIENT_EMAIL')
    if (!privateKey) missing.push('FCM_PRIVATE_KEY')

    if (missing.length > 0) {
      const msg = `FCM missing environment variables: ${missing.join(', ')}`
      this.logger.error(msg)
      throw new Error(msg)
    }

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      throw new Error('Failed to acquire FCM OAuth2 access token')
    }

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
    let sentCount = 0
    let failedCount = 0

    // 1. Resolve and deduplicate destination tokens to prevent duplicate notifications
    const resolvedTokens = new Set<string>()
    for (const raw of tokens) {
      const token = raw.trim()
      if (!token) continue

      if (/^[0-9a-fA-F]{64}$/.test(token)) {
        const fcmToken = await this.convertApnsTokenToFcm(token)
        if (fcmToken) {
          resolvedTokens.add(fcmToken)
          // Asynchronously prune obsolete raw APNs token so DB doesn't retain duplicates
          this.deviceTokenRepo?.removeTokenByValue(token).catch(() => {})
        }
      } else {
        resolvedTokens.add(token)
      }
    }

    const uniqueTokens = Array.from(resolvedTokens)

    await Promise.allSettled(
      uniqueTokens.map(async (token) => {
        const body = {
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            android: {
              priority: 'HIGH',
              notification: {
                color: '#d97757',
                sound: 'upward_chime',
                channel_id: 'upward_alerts',
                notification_priority: 'PRIORITY_MAX',
                default_vibrate_timings: true,
              },
            },
            apns: {
              payload: {
                aps: { sound: 'upward_chime.wav', badge: 1 },
              },
            },
          },
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          failedCount++
          const err = await res.text()
          this.logger.error(`FCM send failed for token ${token.slice(0, 16)}…: ${err}`)
          if (res.status === 404 || err.includes('UNREGISTERED') || err.includes('NotRegistered')) {
            this.logger.warn(`Pruning dead/unregistered FCM token: ${token.slice(0, 16)}…`)
            await this.deviceTokenRepo?.removeTokenByValue(token).catch(() => {})
          }
        } else {
          sentCount++
        }
      }),
    )

    return { sent: sentCount, failed: failedCount }
  }
}
