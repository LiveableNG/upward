import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { GetAllTicketsUseCase } from '../../../application/use-cases/support/get-all-tickets.use-case'
import { ResolveTicketUseCase } from '../../../application/use-cases/support/resolve-ticket.use-case'

@Controller('admin/support')
@UseGuards(AdminJwtAuthGuard)
export class AdminSupportController {
  constructor(
    private readonly getAllTicketsUseCase: GetAllTicketsUseCase,
    private readonly resolveTicketUseCase: ResolveTicketUseCase,
  ) {}

  @Get()
  async getAllTickets() {
    const tickets = await this.getAllTicketsUseCase.execute()
    return { 
      success: true, 
      tickets: tickets.map(t => ({
        ...t,
        user: t.user ? {
          id: t.user.id,
          firstName: t.user.firstName,
          lastName: t.user.lastName,
          email: t.user.email
        } : null
      }))
    }
  }

  @Post(':id/resolve')
  async resolveTicket(@Param('id') id: string, @Body() body: { responseMessage?: string }) {
    const ticketId = parseInt(id)
    const ticket = await this.resolveTicketUseCase.execute(ticketId, body.responseMessage)
    return { success: true, ticket }
  }
}
