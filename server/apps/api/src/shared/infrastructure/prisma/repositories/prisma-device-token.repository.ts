import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaDeviceTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertToken(userId: number, token: string, platform: string): Promise<void> {
    await this.prisma.upward_device_token.upsert({
      where: { userId_token: { userId, token } },
      update: { platform, updatedAt: new Date() },
      create: { userId, token, platform },
    })
  }

  async removeToken(userId: number, token: string): Promise<void> {
    await this.prisma.upward_device_token.deleteMany({
      where: { userId, token },
    })
  }

  async findTokensByUserId(userId: number): Promise<string[]> {
    const records = await this.prisma.upward_device_token.findMany({
      where: { userId },
      select: { token: true },
    })
    return records.map((r) => r.token)
  }

  async findTokensByUserIds(userIds: number[]): Promise<string[]> {
    const records = await this.prisma.upward_device_token.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    })
    return records.map((r) => r.token)
  }

  async findAllTokens(): Promise<string[]> {
    const records = await this.prisma.upward_device_token.findMany({
      select: { token: true },
    })
    return records.map((r) => r.token)
  }
}
