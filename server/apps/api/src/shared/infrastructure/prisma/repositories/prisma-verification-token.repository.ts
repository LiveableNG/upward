import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { VerificationToken, VerificationTokenRepository } from '../../../../domains/auth/verification-token.repository'

@Injectable()
export class PrismaVerificationTokenRepository implements VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): VerificationToken {
    return {
      id: model.id,
      uuid: model.uuid,
      token: model.token,
      otp: model.otp,
      context: model.context,
      identifier: model.identifier,
      metadata: model.metadata,
      resends: model.resends,
      expiresAt: model.expiresAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async create(data: Partial<VerificationToken>): Promise<VerificationToken> {
    const record = await this.prisma.upward_verification_token.create({
      data: {
        uuid: data.uuid || crypto.randomUUID(),
        token: data.token,
        otp: data.otp,
        context: data.context!,
        identifier: data.identifier!,
        metadata: data.metadata || {},
        resends: data.resends || 0,
        expiresAt: data.expiresAt!,
      },
    })
    return this.toDomain(record)
  }

  async findByToken(token: string): Promise<VerificationToken | null> {
    const record = await this.prisma.upward_verification_token.findUnique({
      where: { token },
    })
    return record ? this.toDomain(record) : null
  }

  async findByIdentifier(identifier: string, context: string): Promise<VerificationToken | null> {
    const record = await this.prisma.upward_verification_token.findFirst({
      where: { identifier, context },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.toDomain(record) : null
  }

  async delete(id: number): Promise<void> {
    await this.prisma.upward_verification_token.delete({
      where: { id },
    })
  }

  async deleteOldTokens(identifier: string, context: string): Promise<void> {
    await this.prisma.upward_verification_token.deleteMany({
      where: { identifier, context },
    })
  }

  async update(id: number, data: Partial<VerificationToken>): Promise<VerificationToken> {
    const record = await this.prisma.upward_verification_token.update({
      where: { id },
      data: {
        token: data.token,
        otp: data.otp,
        metadata: data.metadata,
        resends: data.resends,
        expiresAt: data.expiresAt,
      },
    })
    return this.toDomain(record)
  }
}
