import { Injectable, Inject } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaDeviceTokenRepository } from '../../../shared/infrastructure/prisma/repositories/prisma-device-token.repository'
import { PushNotificationService } from '../../../shared/infrastructure/common/push-notification.service'

@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly deviceTokenRepo: PrismaDeviceTokenRepository,
  ) {}

  async execute(userId: string, token: string, platform: string): Promise<void> {
    const user = await this.userRepo.findByUuid(userId)
    if (!user) throw new Error('User not found')
    await this.deviceTokenRepo.upsertToken(user.id!, token, platform)
  }
}

@Injectable()
export class UnregisterDeviceTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly deviceTokenRepo: PrismaDeviceTokenRepository,
  ) {}

  async execute(userId: string, token: string): Promise<void> {
    const user = await this.userRepo.findByUuid(userId)
    if (!user) throw new Error('User not found')
    await this.deviceTokenRepo.removeToken(user.id!, token)
  }
}

@Injectable()
export class SendPushToUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly deviceTokenRepo: PrismaDeviceTokenRepository,
    private readonly pushService: PushNotificationService,
  ) {}

  async execute(
    userId: number,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const tokens = await this.deviceTokenRepo.findTokensByUserId(userId)
    if (tokens.length) {
      await this.pushService.sendToTokens(tokens, payload)
    }
  }
}
