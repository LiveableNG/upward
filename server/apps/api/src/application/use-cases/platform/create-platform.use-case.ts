import { Injectable, Inject, ConflictException } from '@nestjs/common'
import { PlatformRepository, PLATFORM_REPOSITORY } from '../../../domains/companies/company.repository'
import { randomBytes, createHash } from 'crypto'

@Injectable()
export class CreatePlatformUseCase {
  constructor(
    @Inject(PLATFORM_REPOSITORY) private readonly platformRepository: PlatformRepository,
  ) {}

  async execute(data: { name: string; email: string; address?: string; webhookUrl?: string }) {
    // Try to find by name first to handle the "request again with another email/updated data" case
    const existing = await this.platformRepository.findByName(data.name)

    if (existing) {
      const isIdentical =
        existing.email === data.email &&
        (existing.address || undefined) === (data.address || undefined) &&
        (existing.webhookUrl || undefined) === (data.webhookUrl || undefined)

      if (isIdentical) {
        return {
          message: 'Data already exists',
          id: existing.uuid,
          name: existing.name,
          email: existing.email,
        }
      }

      // Update the record
      await this.platformRepository.update(existing.id!, {
        email: data.email,
        address: data.address,
        webhookUrl: data.webhookUrl,
        updatedAt: new Date(),
      })

      return {
        message: 'Platform updated successfully',
        id: existing.uuid,
        name: data.name,
        email: data.email,
      }
    }

    // Check if email is already used by another platform name
    const existingByEmail = await this.platformRepository.findByEmail(data.email)
    if (existingByEmail) {
      throw new ConflictException('Platform with this email already exists under a different name')
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
    
    const platform = await this.platformRepository.findByName(data.name)

    return {
      message: 'Platform created successfully',
      id: platform?.uuid,
      apiKey: rawApiKey,
      name: data.name,
      email: data.email,
    }
  }
}
