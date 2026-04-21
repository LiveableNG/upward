import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, Logger } from '@nestjs/common'
import { PLATFORM_REPOSITORY, PlatformRepository } from '../../../domains/companies/company.repository'
import { createHash } from 'crypto'

function maskApiKey(apiKey: string): string {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '****'
  return apiKey.slice(0, 4) + '...' + apiKey.slice(-4)
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name)

  constructor(
    @Inject(PLATFORM_REPOSITORY) private readonly platformRepository: PlatformRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const apiKeyHeader = request.headers['x-api-key']
    const apiKey =
      Array.isArray(apiKeyHeader)
        ? apiKeyHeader.find((value): value is string => typeof value === 'string')
        : typeof apiKeyHeader === 'string'
          ? apiKeyHeader
          : undefined
    const method = String(request.method ?? 'UNKNOWN')
    const path = String(request.originalUrl  request.url  'unknown-path')
    const ipHeader = request.ip  request.headers['x-forwarded-for']  'unknown-ip'
    const ip = Array.isArray(ipHeader) ? ipHeader.join(',') : String(ipHeader)

    if (!apiKey) {
      this.logger.warn('[' + method + '] ' + path + ' rejected: missing API key | ip=' + ip)
      throw new UnauthorizedException('Missing API key')
    }

    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex')
    const platform = await this.platformRepository.findByApiKey(apiKeyHash)
    const apiKeyMasked = maskApiKey(apiKey)
    const apiKeyHashPreview = apiKeyHash.slice(0, 12)

    request.apiKeyMasked = apiKeyMasked
    request.apiKeyHashPreview = apiKeyHashPreview

    if (!platform) {
      this.logger.warn(
        '[' +
          method +
          '] ' +
          path +
          ' rejected: invalid API key | key=' +
          apiKeyMasked +
          ' hash=' +
          apiKeyHashPreview +
          ' ip=' +
          ip,
      )
      throw new UnauthorizedException('Invalid API key')
    }

    request.platformId = platform.id
    this.logger.log(
      '[' +
        method +
        '] ' +
        path +
        ' authorized | platformId=' +
        platform.id +
        ' key=' +
        apiKeyMasked +
        ' hash=' +
        apiKeyHashPreview,
    )
    return true
  }
}
