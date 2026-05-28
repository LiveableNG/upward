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
  BadRequestException,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../domains/pm/pm-signature.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/signatures')
@UseGuards(JwtAuthGuard)
export class PmSignatureController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
    private readonly s3Service: S3Service,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadSignature(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    if (!body.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for signatures')
    }

    const buffer = Buffer.from(body.base64Data, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = body.contentType.split('/')[1] || 'png'
    const key = `pm/${pm.uuid}/signatures/sig_${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, body.contentType)

    return { fileKey: key, publicUrl }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSignatures(@Req() req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const signatures = await this.signatureRepo.findByPmId(pm.id)
    return Promise.all(
      signatures.map(async (sig) => ({
        ...sig,
        fileUrl: sig.fileKey ? await this.s3Service.getDownloadUrl(sig.fileKey) : null,
      }))
    )
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveSignature(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const isDefault = body.isDefault === true

    if (isDefault) {
      // Clear existing default signatures for this PM
      await (this.prisma as any).upward_pm_signature.updateMany({
        where: { pmId: pm.id },
        data: { isDefault: false },
      })
    }

    const signature = await this.signatureRepo.save({
      uuid: randomUUID(),
      pmId: pm.id,
      name: body.name || 'Unnamed Signature',
      type: body.type, // 'upload' | 'pad' | 'digital'
      fileKey: body.fileKey || null,
      content: body.content || null,
      isDefault,
    })

    return signature
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

    const signatureId = Number(id)
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pm.id) {
      throw new NotFoundException('Signature not found')
    }

    // Set all other signatures to false
    await (this.prisma as any).upward_pm_signature.updateMany({
      where: { pmId: pm.id },
      data: { isDefault: false },
    })

    // Set this one as default
    return this.signatureRepo.update(signatureId, { isDefault: true })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSignature(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const signatureId = Number(id)
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pm.id) {
      throw new NotFoundException('Signature not found')
    }

    await this.signatureRepo.delete(signatureId)
  }
}
