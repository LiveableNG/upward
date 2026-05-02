import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { WaitlistRepository } from '../../../../domains/waitlist/waitlist.repository'
import { WaitlistEntry, WaitlistEntryProps } from '../../../../domains/waitlist/waitlist.entity'
import { Prisma, upward_waitlist } from '@prisma/client'

@Injectable()
export class PrismaWaitlistRepository implements WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: upward_waitlist): WaitlistEntry {
    const props: WaitlistEntryProps = {
      email: model.email,
      firstName: model.firstName,
      lastName: model.lastName,
      phone: model.phone,
      role: model.role,
      benefits: model.benefits,
      acceptTerms: model.acceptTerms,
      wantsAmbassador: model.wantsAmbassador,
      country: model.country,
      city: model.city,
      selectedSession: model.selectedSession,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      campaignWeekSent: model.campaignWeekSent,
      confirmationSent: model.confirmationSent,
      confirmationEmailStatus: model.confirmationEmailStatus,
      confirmationEmailError: model.confirmationEmailError,
      confirmationEmailRetries: model.confirmationEmailRetries,
      abVariant: model.abVariant,
      unsubscribed: model.unsubscribed,
      unsubscribedAt: model.unsubscribedAt,
      uuid: model.uuid,
    }

    return WaitlistEntry.reconstitute(model.id, props)
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const record = await this.prisma.upward_waitlist.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async findByUuid(uuid: string): Promise<WaitlistEntry | null> {
    // In this schema, id is the uuid
    return this.findById(uuid)
  }

  async findAll(params: {
    where?: Prisma.upward_waitlistWhereInput
    orderBy?:
      | Prisma.upward_waitlistOrderByWithRelationInput
      | Prisma.upward_waitlistOrderByWithRelationInput[]
    take?: number
    skip?: number
  }): Promise<WaitlistEntry[]> {
    const records = await this.prisma.upward_waitlist.findMany({
      where: params?.where || {},
      orderBy: params?.orderBy,
      take: params?.take,
      skip: params?.skip,
    })
    return records.map((r) => this.toDomain(r))
  }

  async findByEmail(email: string): Promise<WaitlistEntry | null> {
    const record = await this.prisma.upward_waitlist.findUnique({
      where: { email },
    })
    return record ? this.toDomain(record) : null
  }

  async save(entry: WaitlistEntry): Promise<void> {
    const props = entry.getProps()
    const id = entry.getId

    const data = {
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      phone: props.phone,
      role: props.role,
      benefits: props.benefits,
      acceptTerms: props.acceptTerms,
      wantsAmbassador: props.wantsAmbassador,
      country: props.country,
      city: props.city,
      selectedSession: props.selectedSession,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      campaignWeekSent: props.campaignWeekSent,
      confirmationSent: props.confirmationSent,
      confirmationEmailStatus: props.confirmationEmailStatus,
      confirmationEmailError: props.confirmationEmailError,
      confirmationEmailRetries: props.confirmationEmailRetries,
      abVariant: props.abVariant,
      unsubscribed: props.unsubscribed,
      unsubscribedAt: props.unsubscribedAt,
      uuid: props.uuid,
    }

    if (id === '') {
      await this.prisma.upward_waitlist.create({
        data: data,
      })
    } else {
      await this.prisma.upward_waitlist.update({
        where: { id },
        data: data,
      })
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.upward_waitlist.delete({
      where: { id },
    })
  }
}
