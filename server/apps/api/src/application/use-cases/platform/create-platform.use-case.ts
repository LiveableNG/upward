import { Injectable, Inject, ConflictException } from '@nestjs/common'
import { PlatformRepository, PLATFORM_REPOSITORY } from '../../../domains/companies/company.repository'
import { randomBytes, createHash } from 'crypto'

@Injectable()
export class CreatePlatformUseCase {
  constructor(
    @Inject(PLATFORM_REPOSITORY) private readonly platformRepository: PlatformRepository,
  ) {}

  async execute(data: { name: string; email: string; address?: string; webhookUrl?: string }) {
    const existing = await this.platformRepository.findByEmail(data.email)
    if (existing) {
      throw new ConflictException('Platform with this email already exists')
    }

    const rawApiKey = `up_sk_live_${randomBytes(12).toString('hex')}`
    const apiKeyHash = createHash('sha256').update(rawApiKey).digest('hex')

    await this.platformRepository.save({
        apiKey: apiKeyHash,
        name: data.name,
        email: data.email,
        address: data.address,
        webhookUrl: data.webhookUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as any)
    const platform = await this.platformRepository.findByEmail(data.email)

    return {
      id: platform?.uuid,
      apiKey: rawApiKey,
      name: data.name,
      email: data.email
    }
  }
}
