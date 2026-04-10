import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { ISupportTicketRepository, SupportTicket } from '../../../../domains/support/support.repository'
import { EncryptionService } from '../../common/encryption.service'

@Injectable()
export class PrismaSupportTicketRepository implements ISupportTicketRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {}

  private mapUser(user: any) {
    if (!user) return null
    return {
      ...user,
      firstName: this.encryption.decrypt(user.firstName),
      lastName: this.encryption.decrypt(user.lastName),
      email: this.encryption.decrypt(user.email),
    }
  }

  async create(data: Omit<SupportTicket, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'user'>): Promise<SupportTicket> {
    const ticket = await this.prisma.upward_support_ticket.create({ 
      data: {
        userId: data.userId,
        message: data.message,
        status: data.status,
        resolvedAt: data.resolvedAt,
      },
      include: { user: true }
    })
    return {
      ...ticket,
      user: this.mapUser(ticket.user)
    } as any
  }

  async findById(id: number): Promise<SupportTicket | null> {
    const ticket = await this.prisma.upward_support_ticket.findUnique({ where: { id }, include: { user: true } })
    if (!ticket) return null
    return {
      ...ticket,
      user: this.mapUser(ticket.user)
    } as any
  }

  async findAll(): Promise<SupportTicket[]> {
    const tickets = await this.prisma.upward_support_ticket.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } })
    return tickets.map(ticket => ({
      ...ticket,
      user: this.mapUser(ticket.user)
    })) as any
  }

  async findByUserId(userId: number): Promise<SupportTicket[]> {
    const tickets = await this.prisma.upward_support_ticket.findMany({ where: { userId }, include: { user: true }, orderBy: { createdAt: 'desc' } })
    return tickets.map(ticket => ({
      ...ticket,
      user: this.mapUser(ticket.user)
    })) as any
  }

  async update(id: number, data: Partial<SupportTicket>): Promise<SupportTicket> {
    const ticket = await this.prisma.upward_support_ticket.update({ 
      where: { id }, 
      data: {
        status: data.status,
        resolvedAt: data.resolvedAt,
      }, 
      include: { user: true } 
    })
    return {
      ...ticket,
      user: this.mapUser(ticket.user)
    } as any
  }
}
