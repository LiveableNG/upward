import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const apiKey = request.headers['x-api-key']
    const masterKey = this.configService.get<string>('EXTERNAL_API_KEY') || 'up_sk_live_7f8d2e9a1b4c'

    if (!apiKey || apiKey !== masterKey) {
      throw new UnauthorizedException('Invalid or missing API key')
    }

    return true
  }
}
