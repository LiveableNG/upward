import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../domains/pm/pm-letterhead.repository'
import { randomUUID } from 'crypto'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/letterheads')
@UseGuards(JwtAuthGuard)
export class PmLetterheadController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getLetterheads(@Req() req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    return this.letterheadRepo.findByPmId(pm.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveLetterhead(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const isDefault = body.isDefault === true

    if (isDefault) {
      // Clear existing default letterheads for this PM
      await this.prisma.upward_pm_letterhead.updateMany({
        where: { pmId: pm.id },
        data: { isDefault: false },
      })
    }

    const letterhead = await this.letterheadRepo.save({
      uuid: randomUUID(),
      pmId: pm.id,
      isDefault,
      pageCount: Number(body.pageCount) || 1,
      templateFileKey: body.templateFileKey || null,
      previewFirstPageKey: body.previewFirstPageKey || null,
      previewContinuationPageKey: body.previewContinuationPageKey || null,
      templateConfig: body.templateConfig || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return letterhead
  }

  @Patch(':id/set-as-default')
  @HttpCode(HttpStatus.OK)
  async setAsDefault(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const letterheadId = Number(id)
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pm.id) {
      throw new NotFoundException('Letterhead not found')
    }

    // Set all other letterheads to false
    await this.prisma.upward_pm_letterhead.updateMany({
      where: { pmId: pm.id },
      data: { isDefault: false },
    })

    // Set this one as default
    return this.letterheadRepo.update(letterheadId, { isDefault: true })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLetterhead(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const letterheadId = Number(id)
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pm.id) {
      throw new NotFoundException('Letterhead not found')
    }

    await this.letterheadRepo.delete(letterheadId)
  }
}
