import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { IKycRepository, KycVerificationRecord } from '../../../../domains/kyc/kyc.repository'

@Injectable()
export class PrismaKycRepository implements IKycRepository {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): KycVerificationRecord {
    return {
      id: model.id,
      uuid: model.uuid,
      userId: model.userId,
      idType: model.idType,
      idNumberHash: model.idNumberHash,
      idNumberMasked: model.idNumberMasked,
      provider: model.provider,
      status: model.status,
      matchScore: model.matchScore,
      failureReason: model.failureReason,
      metadata: model.metadata,
      verifiedAt: model.verifiedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async create(
    data: Omit<KycVerificationRecord, 'id' | 'createdAt' | 'updatedAt'>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any,
  ): Promise<KycVerificationRecord> {
    const db = tx || this.prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (db as any).upward_kyc_verification.create({
      data: {
        uuid: data.uuid,
        userId: data.userId,
        idType: data.idType,
        idNumberHash: data.idNumberHash,
        idNumberMasked: data.idNumberMasked,
        provider: data.provider,
        status: data.status,
        matchScore: data.matchScore,
        failureReason: data.failureReason,
        metadata: data.metadata || {},
        verifiedAt: data.verifiedAt,
      },
    })
    return this.toDomain(created)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findByHash(idNumberHash: string, tx?: any): Promise<KycVerificationRecord | null> {
    const db = tx || this.prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (db as any).upward_kyc_verification.findFirst({
      where: { idNumberHash },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.toDomain(record) : null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findVerifiedByHash(idNumberHash: string, tx?: any): Promise<KycVerificationRecord | null> {
    const db = tx || this.prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (db as any).upward_kyc_verification.findFirst({
      where: { idNumberHash, status: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.toDomain(record) : null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findByUserId(userId: number, tx?: any): Promise<KycVerificationRecord[]> {
    const db = tx || this.prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await (db as any).upward_kyc_verification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(this.toDomain)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findLatestVerifiedByUserId(
    userId: number,
    tx?: any,
  ): Promise<KycVerificationRecord | null> {
    const db = tx || this.prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (db as any).upward_kyc_verification.findFirst({
      where: { userId, status: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.toDomain(record) : null
  }
}
