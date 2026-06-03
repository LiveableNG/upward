import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  Body,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { UploadContractUseCase } from '../../../application/use-cases/contracts/upload-contract.use-case'
import { GetContractUploadUrlUseCase } from '../../../application/use-cases/contracts/get-contract-upload-url.use-case'
import { GetContractsUseCase } from '../../../application/use-cases/contracts/get-contracts.use-case'
import { DeleteContractUseCase } from '../../../application/use-cases/contracts/delete-contract.use-case'
import { DownloadContractUseCase } from '../../../application/use-cases/contracts/download-contract.use-case'

@Controller('user/contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(
    private readonly uploadContract: UploadContractUseCase,
    private readonly getContractUploadUrl: GetContractUploadUrlUseCase,
    private readonly getContracts: GetContractsUseCase,
    private readonly deleteContract: DeleteContractUseCase,
    private readonly downloadContract: DownloadContractUseCase,
  ) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  async getUploadUrl(
    @Req() req: any,
    @Body() body: { fileName: string; fileType: string; fileSize?: number }
  ) {
    const userId = req.user.id
    if (!body.fileName || !body.fileType) {
      throw new BadRequestException('fileName and fileType are required')
    }
    const result = await this.getContractUploadUrl.execute({
      userId,
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
    })
    return {
      success: true,
      ...result,
    }
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Req() req: any,
    @Body() body: {
      uuid: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
      propertyUuid?: string
      userPropertyId?: number
    }
  ) {
    const userId = req.user.id // From JwtAuthGuard

    if (!body.uuid || !body.fileName || !body.fileUrl || !body.fileType || !body.fileSize) {
      throw new BadRequestException('uuid, fileName, fileUrl, fileType, and fileSize are required')
    }

    const result = await this.uploadContract.execute({
      userId,
      propertyUuid: body.propertyUuid,
      userPropertyId: body.userPropertyId,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      uuid: body.uuid,
      fileType: body.fileType,
      fileSize: body.fileSize,
    })

    return {
      success: true,
      contract: result,
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Req() req: any) {
    const userId = req.user.id
    const contracts = await this.getContracts.execute(userId)
    return {
      success: true,
      contracts,
    }
  }

  @Get(':uuid/download')
  async download(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Res() res: any,
  ) {
    const userId = req.user.id
    const { buffer, fileName, fileType } = await this.downloadContract.execute(userId, uuid)

    const sanitizedFileName = encodeURIComponent(fileName || 'document.pdf')

    if (typeof res.set === 'function') {
      res.set({
        'Content-Type': fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
        'Content-Length': buffer.length,
      })
      res.send(buffer)
    } else {
      res.header('Content-Type', fileType || 'application/octet-stream')
      res.header('Content-Disposition', `attachment; filename="${sanitizedFileName}"`)
      res.header('Content-Length', buffer.length)
      res.send(buffer)
    }
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.OK)
  async delete(@Req() req: any, @Param('uuid') uuid: string) {
    const userId = req.user.id
    await this.deleteContract.execute(userId, uuid)
    return {
      success: true,
      message: 'Document removed successfully',
    }
  }
}
