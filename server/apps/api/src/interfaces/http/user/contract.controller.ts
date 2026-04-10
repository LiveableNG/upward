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
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { UploadContractUseCase } from '../../../application/use-cases/contracts/upload-contract.use-case'
import { GetContractsUseCase } from '../../../application/use-cases/contracts/get-contracts.use-case'
import { DeleteContractUseCase } from '../../../application/use-cases/contracts/delete-contract.use-case'

@Controller('user/contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(
    private readonly uploadContract: UploadContractUseCase,
    private readonly getContracts: GetContractsUseCase,
    private readonly deleteContract: DeleteContractUseCase,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(@Req() req: any) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data')
    }

    const data = await req.file()
    if (!data) {
      throw new BadRequestException('No file uploaded')
    }

    const buffer = await data.toBuffer()
    const userId = req.user.id // From JwtAuthGuard

    // Optionally get userPropertyId from fields
    const userPropertyId = data.fields?.userPropertyId?.value 
      ? parseInt(data.fields.userPropertyId.value) 
      : undefined

    const result = await this.uploadContract.execute({
      userId,
      userPropertyId,
      fileName: data.filename,
      fileBuffer: buffer,
      fileType: data.mimetype,
      fileSize: buffer.length,
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
