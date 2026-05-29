import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { PmLetterhead, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'

@Injectable()
export class PrismaPmLetterheadRepository implements IPmLetterheadRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): PmLetterhead {
    return {
      id: model.id,
      uuid: model.uuid,
      pmId: model.pmId,
      isDefault: model.isDefault,
      pageCount: model.pageCount,
      templateFileKey: model.templateFileKey,
      previewFirstPageKey: model.previewFirstPageKey,
      previewContinuationPageKey: model.previewContinuationPageKey,
      templateConfig: model.templateConfig,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findById(id: number): Promise<PmLetterhead | null> {
    const record = await (this.prisma as any).upward_pm_letterhead.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<PmLetterhead | null> {
    const record = await (this.prisma as any).upward_pm_letterhead.findUnique({
      where: { uuid },
    })
    return record ? this.toDomain(record) : null
  }

  async findByPmId(pmId: number): Promise<PmLetterhead[]> {
    const records = await (this.prisma as any).upward_pm_letterhead.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map((record: any) => this.toDomain(record))
  }

  async findDefaultByPmId(pmId: number): Promise<PmLetterhead | null> {
    const record = await (this.prisma as any).upward_pm_letterhead.findFirst({
      where: { pmId, isDefault: true },
    })
    return record ? this.toDomain(record) : null
  }

  async save(letterhead: PmLetterhead): Promise<PmLetterhead> {
    if (letterhead.id) {
      return this.update(letterhead.id, letterhead)
    }

    const record = await (this.prisma as any).upward_pm_letterhead.create({
      data: {
        uuid: letterhead.uuid,
        pmId: letterhead.pmId,
        isDefault: letterhead.isDefault,
        pageCount: letterhead.pageCount,
        templateFileKey: letterhead.templateFileKey,
        previewFirstPageKey: letterhead.previewFirstPageKey,
        previewContinuationPageKey: letterhead.previewContinuationPageKey,
        templateConfig: letterhead.templateConfig || {},
      },
    })
    return this.toDomain(record)
  }

  async update(id: number, data: Partial<PmLetterhead>): Promise<PmLetterhead> {
    const updateData: any = {}

    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault
    if (data.pageCount !== undefined) updateData.pageCount = data.pageCount
    if (data.templateFileKey !== undefined) updateData.templateFileKey = data.templateFileKey
    if (data.previewFirstPageKey !== undefined) updateData.previewFirstPageKey = data.previewFirstPageKey
    if (data.previewContinuationPageKey !== undefined) updateData.previewContinuationPageKey = data.previewContinuationPageKey
    if (data.templateConfig !== undefined) updateData.templateConfig = data.templateConfig

    const record = await (this.prisma as any).upward_pm_letterhead.update({
      where: { id },
      data: updateData,
    })
    return this.toDomain(record)
  }

  async delete(id: number): Promise<void> {
    await (this.prisma as any).upward_pm_letterhead.delete({
      where: { id },
    })
  }
}
