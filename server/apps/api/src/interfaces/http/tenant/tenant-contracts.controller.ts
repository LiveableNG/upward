import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import {
  GetTenantContractsUseCase,
  UploadTenantContractUseCase,
  DeleteTenantContractUseCase,
} from '@application/use-cases/tenant/tenant-contracts.use-cases'

interface FastifyRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

@Controller('tenant/contracts')
@UseGuards(JwtAuthGuard)
export class TenantContractsController {
  constructor(
    private readonly getContracts: GetTenantContractsUseCase,
    private readonly uploadContract: UploadTenantContractUseCase,
    private readonly deleteContract: DeleteTenantContractUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Req() req: FastifyRequest) {
    if (!req.user?.id) throw new BadRequestException('Unauthorized')
    return this.getContracts.execute(req.user.id)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Req() req: FastifyRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any,
  ) {
    if (!req.user?.id) throw new BadRequestException('Unauthorized')
    if (!file) throw new BadRequestException('No file uploaded')

    return this.uploadContract.execute({
      tenantId: req.user.id,
      name: file.originalname,
      buffer: file.buffer,
      type: file.mimetype,
      size: file.size,
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: FastifyRequest, @Param('id') id: string) {
    if (!req.user?.id) throw new BadRequestException('Unauthorized')
    await this.deleteContract.execute(id, req.user.id)
  }
}
