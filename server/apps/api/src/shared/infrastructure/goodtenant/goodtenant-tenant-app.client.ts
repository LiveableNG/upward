import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Outbound HTTP client for GT's Upward integration tenant-app bridge.
 * Auth: Bearer GOODTENANT_API_TOKEN (must match GT UPWARD_API_TOKEN).
 */
@Injectable()
export class GoodTenantTenantAppClient {
  private readonly logger = new Logger(GoodTenantTenantAppClient.name)
  private readonly baseUrl: string
  private readonly token: string

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('GOODTENANT_API_BASE_URL') ||
      'http://liveable-landlord-api.test/api-upward/v1'
    ).replace(/\/$/, '')
    this.token =
      this.configService.get<string>('GOODTENANT_API_TOKEN') || 'upward-api-token'
  }

  async get(
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, query)
    this.logger.debug(`GET ${url}`)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })

    return this.parseResponse(res, path)
  }

  async post(
    path: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, query)
    this.logger.debug(`POST ${url}`)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    })

    return this.parseResponse(res, `POST ${path}`)
  }

  async postMultipart(
    path: string,
    form: FormData,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, query)
    this.logger.debug(`POST multipart ${url}`)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: form,
    })

    return this.parseResponse(res, `POST multipart ${path}`)
  }

  async delete(
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, query)
    this.logger.debug(`DELETE ${url}`)

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })

    return this.parseResponse(res, `DELETE ${path}`)
  }

  async patch(
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, query)
    this.logger.debug(`PATCH ${url}`)

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })

    return this.parseResponse(res, `PATCH ${path}`)
  }

  private buildUrl(
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    }

    const qs = params.toString()
    return `${this.baseUrl}/integration/tenant-app/${path.replace(/^\//, '')}${qs ? `?${qs}` : ''}`
  }

  private async parseResponse(res: Response, label: string): Promise<unknown> {
    const text = await res.text()
    let parsed: unknown = {}
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { message: text }
      }
    }

    if (!res.ok) {
      this.logger.warn(`GT tenant-app ${label} → ${res.status}`)
      throw new HttpException(
        (typeof parsed === 'object' && parsed !== null
          ? parsed
          : { message: String(parsed) }) as Record<string, unknown>,
        res.status,
      )
    }

    return parsed
  }
}
