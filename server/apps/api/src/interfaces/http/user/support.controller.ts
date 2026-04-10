import { Controller, Post, Get, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { CreateSupportTicketUseCase } from '../../../application/use-cases/support/create-support-ticket.use-case'
import { GetUserTicketsUseCase } from '../../../application/use-cases/support/get-user-tickets.use-case'

@Controller('user/support')
@UseGuards(JwtAuthGuard)
export class UserSupportController {
  constructor(
    private readonly createSupportTicketUseCase: CreateSupportTicketUseCase,
    private readonly getUserTicketsUseCase: GetUserTicketsUseCase,
  ) {}

  @Post()
  async createTicket(@Req() req: any, @Body() body: { message: string }) {
    if (!req.user?.id) throw new UnauthorizedException()
    const ticket = await this.createSupportTicketUseCase.execute(req.user.id, body.message)
    return { success: true, ticket }
  }

  @Get()
  async getTickets(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException()
    const tickets = await this.getUserTicketsUseCase.execute(req.user.id)
    return { success: true, tickets }
  }
}
