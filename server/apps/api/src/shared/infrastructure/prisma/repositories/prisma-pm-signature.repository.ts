import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { PmSignature, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'

@Injectable()
export class PrismaPmSignatureRepository implements IPmSignatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): PmSignature {
    return {
      id: model.id,
      uuid: model.uuid,
      pmId: model.pmId,
      name: model.name,
      type: model.type,
      fileKey: model.fileKey,
      content: model.content,
      isDefault: model.isDefault,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findById(id: number): Promise<PmSignature | null> {
    const record = await (this.prisma as any).upward_pm_signature.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<PmSignature | null> {
    const record = await (this.prisma as any).upward_pm_signature.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async findByPmId(pmId: number): Promise<PmSignature[]> {
    const records = await (this.prisma as any).upward_pm_signature.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map((record: any) => this.toDomain(record))
  }

  async findDefaultByPmId(pmId: number): Promise<PmSignature | null> {
    const record = await (this.prisma as any).upward_pm_signature.findFirst({
      where: { pmId, isDefault: true },
    })
    return record ? this.toDomain(record) : null
  }

  async save(signature: PmSignature): Promise<PmSignature> {
    if (signature.id) {
      return this.update(signature.id, signature)
    }

    const record = await (this.prisma as any).upward_pm_signature.create({
      data: {
        uuid: signature.uuid,
        pmId: signature.pmId,
        name: signature.name,
        type: signature.type,
        fileKey: signature.fileKey || null,
        content: signature.content || null,
        isDefault: signature.isDefault,
      },
    })
    return this.toDomain(record)
  }

  async update(id: number, data: Partial<PmSignature>): Promise<PmSignature> {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.fileKey !== undefined) updateData.fileKey = data.fileKey
    if (data.content !== undefined) updateData.content = data.content
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const record = await (this.prisma as any).upward_pm_signature.update({
      where: { id },
      data: updateData,
    })
    return this.toDomain(record)
  }

  async delete(id: number): Promise<void> {
    await (this.prisma as any).upward_pm_signature.delete({
      where: { id },
    })
  }
}
