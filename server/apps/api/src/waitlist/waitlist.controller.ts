import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UsePipes,
  ValidationPipe,
  Param,
} from '@nestjs/common'
import { WaitlistService } from './waitlist.service'
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto'
import type { WaitlistEntryResponse, ApiSuccess } from '@upward/shared-types'

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() dto: CreateWaitlistEntryDto): Promise<ApiSuccess<WaitlistEntryResponse>> {
    const data = await this.waitlistService.create(dto)
    const message = 'Successfully joined the waitlist'
    return { data, message }
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  async count(): Promise<ApiSuccess<{ total: number }>> {
    const total = await this.waitlistService.count()
    return { data: { total } }
  }

  @Get(':email')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('email') email: string): Promise<ApiSuccess<WaitlistEntryResponse | null>> {
    const data = await this.waitlistService.findByEmail(email)
    return { data: data as WaitlistEntryResponse | null }
  }
}
