import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common'
import { PLATFORM_REPOSITORY, PlatformRepository } from '@domains/companies/company.repository'
import { createHash } from 'crypto'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(PLATFORM_REPOSITORY) private readonly platformRepository: PlatformRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const apiKey = request.headers['x-api-key']

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key')
    }

    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex')
    const platform = await this.platformRepository.findByApiKey(apiKeyHash)

    if (!platform) {
      throw new UnauthorizedException('Invalid API key')
    }

    request.platformId = platform.id
    return true
  }
}
