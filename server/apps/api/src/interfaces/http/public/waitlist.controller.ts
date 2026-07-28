import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
  Param,
  Req,
  Res,
} from '@nestjs/common'
import { IncomingMessage } from 'node:http'
import { JoinWaitlistUseCase } from '../../../application/use-cases/waitlist/join-waitlist.use-case'
import { GetWaitlistCountUseCase } from '../../../application/use-cases/waitlist/get-waitlist-count.use-case'
import { GetWaitlistByEmailUseCase } from '../../../application/use-cases/waitlist/get-waitlist-by-email.use-case'
import { TrackInteractionUseCase } from '../../../application/use-cases/analytics/track-interaction.use-case'
import { UnsubscribeWaitlistUseCase } from '../../../application/use-cases/waitlist/unsubscribe-waitlist.use-case'
import { CreateWaitlistEntryDto } from '../dto/create-waitlist-entry.dto'
import { TrackInteractionDto } from '../dto/track-interaction.dto'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import type { WaitlistEntryResponse, ApiSuccess } from '@upward/shared-types'

@Controller('waitlist')
export class WaitlistController {
  constructor(
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
    private readonly getWaitlistCountUseCase: GetWaitlistCountUseCase,
    private readonly getWaitlistByEmailUseCase: GetWaitlistByEmailUseCase,
    private readonly trackInteractionUseCase: TrackInteractionUseCase,
    private readonly unsubscribeWaitlistUseCase: UnsubscribeWaitlistUseCase,
    private readonly userAuthService: UserAuthService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() dto: CreateWaitlistEntryDto): Promise<ApiSuccess<WaitlistEntryResponse>> {
    const data = await this.joinWaitlistUseCase.execute(dto)
    const message = 'Successfully joined the waitlist'
    return { data, message }
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  async count(): Promise<ApiSuccess<{ total: number }>> {
    const total = await this.getWaitlistCountUseCase.execute()
    return { data: { total } }
  }

  @Get(':email')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('email') email: string): Promise<ApiSuccess<WaitlistEntryResponse | null>> {
    const data = await this.getWaitlistByEmailUseCase.execute(email)
    return { data: data as WaitlistEntryResponse | null }
  }

  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  async track(
    @Body() dto: TrackInteractionDto,
    @Req() req: IncomingMessage,
  ): Promise<ApiSuccess<{ success: boolean }>> {
    const ip = (req.headers['x-forwarded-for'] as string | undefined) ?? req.socket?.remoteAddress
    const ua = req.headers['user-agent']
    await this.trackInteractionUseCase.execute(dto, ip, ua)
    return { data: { success: true } }
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Body('email') bodyEmail: string,
    @Body('token') bodyToken: string,
    @Query('email') queryEmail: string,
    @Query('token') queryToken: string,
  ): Promise<ApiSuccess<{ success: boolean }>> {
    const rawToken = bodyToken || queryToken
    const email = rawToken
      ? Buffer.from(rawToken, 'base64url').toString('utf8')
      : (bodyEmail || queryEmail)
    const success = await this.unsubscribeWaitlistUseCase.execute(email)
    return { data: { success }, message: success ? 'Unsubscribed' : 'User not found' }
  }

  @Get('claim/:uuid')
  @HttpCode(HttpStatus.OK)
  async getClaimData(@Param('uuid') uuid: string) {
    return this.userAuthService.getWaitlistClaimData(uuid)
  }

  @Post('claim/:uuid/accept')
  @HttpCode(HttpStatus.OK)
  async acceptClaim(
    @Param('uuid') uuid: string,
    @Body() data: any,
    @Res({ passthrough: false }) reply: any,
  ) {
    const waitlistEntry = await this.userAuthService.getWaitlistClaimData(uuid)
    if (!waitlistEntry || waitlistEntry.email !== data.email) {
      return reply.status(HttpStatus.FORBIDDEN).send({
        success: false,
        message: 'Invalid waitlist claim details'
      })
    }

    const response = await this.userAuthService.signup({
      ...data,
      isFromWaitlist: true
    })

    await this.userAuthService.deleteWaitlistEntry(uuid)

    const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']
    
    reply.setCookie('user_refresh', response.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    reply.setCookie('pay_access_token', response.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return reply.status(HttpStatus.OK).send({
      success: true,
      accessToken: response.accessToken,
      user: response.user
    })
  }
}
