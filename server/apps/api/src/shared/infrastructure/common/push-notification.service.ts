import { Injectable, Logger } from '@nestjs/common'


@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name)
  private readonly projectId = process.env.FCM_PROJECT_ID
  private readonly clientEmail = process.env.FCM_CLIENT_EMAIL
  private readonly privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n')

  private accessToken: string | null = null
  private tokenExpiresAt = 0

  /** Obtain a short-lived OAuth2 token for FCM HTTP v1 */
  private async getAccessToken(): Promise<string | null> {
    if (!this.projectId || !this.clientEmail || !this.privateKey) return null
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return this.accessToken

    try {
      const { createSign } = await import('crypto')
      const now = Math.floor(Date.now() / 1000)
      const exp = now + 3600

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(
        JSON.stringify({
          iss: this.clientEmail,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp,
        }),
      ).toString('base64url')

      const sign = createSign('RSA-SHA256')
      sign.write(`${header}.${payload}`)
      sign.end()
      const sig = sign.sign(this.privateKey!, 'base64url')
      const jwt = `${header}.${payload}.${sig}`

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      })

      const json = await resp.json() as { access_token: string }
      this.accessToken = json.access_token
      this.tokenExpiresAt = exp * 1000
      return this.accessToken
    } catch (err) {
      this.logger.error('Failed to obtain FCM access token', err)
      return null
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    if (!tokens.length) return

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      const missing = []
      if (!this.projectId) missing.push('FCM_PROJECT_ID')
      if (!this.clientEmail) missing.push('FCM_CLIENT_EMAIL')
      if (!this.privateKey) missing.push('FCM_PRIVATE_KEY')

      if (missing.length > 0) {
        this.logger.error(`FCM missing environment variables: ${missing.join(', ')}`)
      } else {
        this.logger.warn('FCM not configured or token acquisition failed — push notification skipped')
      }
      return
    }

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`

    await Promise.allSettled(
      tokens.map(async (token) => {
        const body = {
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            android: {
              notification: {
                icon: 'ic_notification',
                color: '#d97757',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: { sound: 'default', badge: 1 },
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
          const err = await res.text()
          this.logger.error(`FCM send failed for token ${token.slice(0, 16)}…: ${err}`)
        }
      }),
    )
  }
}
