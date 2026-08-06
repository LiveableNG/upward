import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import {
  GetDocumentPdfUseCase,
  GetSignatureImageUseCase,
  GetPublicAssetUseCase,
  GetRelayDocumentUseCase,
} from '../../../application/public/use-cases/documents';

@Controller('public/documents')
export class PublicDocumentController {
  constructor(
    private readonly getDocumentPdfUseCase: GetDocumentPdfUseCase,
    private readonly getSignatureImageUseCase: GetSignatureImageUseCase,
    private readonly getPublicAssetUseCase: GetPublicAssetUseCase,
    private readonly getRelayDocumentUseCase: GetRelayDocumentUseCase,
  ) {}

  @Get(':uuid/pdf')
  async getDocumentPdf(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const result = await this.getDocumentPdfUseCase.execute(uuid);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { contentType: result.contentType });
  }

  @Get('signatures/:uuid/image')
  async getSignatureImage(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const result = await this.getSignatureImageUseCase.execute(uuid);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { cacheControl: result.cacheControl });
  }

  @Get('users/avatar/:uuid/:filename')
  async getUserAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `users/${uuid}/avatar/${filename}`;
    const result = await this.getPublicAssetUseCase.execute(s3Key);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { cacheControl: result.cacheControl });
  }

  @Get('pm/avatar/:uuid/:filename')
  async getPmAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `pm/${uuid}/avatar/${filename}`;
    const result = await this.getPublicAssetUseCase.execute(s3Key);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { cacheControl: result.cacheControl });
  }

  @Get('pm/email-settings/logo/:uuid/:filename')
  async getPmEmailLogo(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `pm/${uuid}/email-settings/${filename}`;
    const result = await this.getPublicAssetUseCase.execute(s3Key);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { cacheControl: result.cacheControl });
  }

  @Get('pm/receipt-settings/logo/:uuid/:filename')
  async getPmReceiptLogo(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    const s3Key = `pm/${uuid}/receipt-settings/${filename}`;
    const result = await this.getPublicAssetUseCase.execute(s3Key);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { cacheControl: result.cacheControl });
  }

  @Get('relays/:uuid/download')
  async getRelayDocument(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    const result = await this.getRelayDocumentUseCase.execute(uuid);
    return S3Service.streamBuffer(result.buffer, result.filename, res, { contentType: result.contentType });
  }
}
