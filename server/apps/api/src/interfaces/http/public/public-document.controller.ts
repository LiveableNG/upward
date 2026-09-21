import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  GetDocumentPdfUseCase,
  GetSignatureImageUseCase,
  GetPublicAssetUseCase,
  GetRelayDocumentUseCase,
} from '../../../application/public/use-cases/documents';
import { GetPaymentProofUseCase } from '../../../application/use-cases/payments/manual-payment.use-cases';

@Controller('public/documents')
export class PublicDocumentController {
  constructor(
    private readonly getDocumentPdfUseCase: GetDocumentPdfUseCase,
    private readonly getSignatureImageUseCase: GetSignatureImageUseCase,
    private readonly getPublicAssetUseCase: GetPublicAssetUseCase,
    private readonly getRelayDocumentUseCase: GetRelayDocumentUseCase,
    private readonly getPaymentProofUseCase: GetPaymentProofUseCase,
  ) {}

  @Get(':uuid/pdf')
  async getDocumentPdf(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    return this.getDocumentPdfUseCase.execute(uuid, res);
  }

  @Get('signatures/:uuid/image')
  async getSignatureImage(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    return this.getSignatureImageUseCase.execute(uuid, res);
  }

  @Get('users/avatar/:uuid/:filename')
  async getUserAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.getPublicAssetUseCase.execute(`users/${uuid}/avatar/${filename}`, res);
  }

  @Get('pm/avatar/:uuid/:filename')
  async getPmAvatar(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.getPublicAssetUseCase.execute(`pm/${uuid}/avatar/${filename}`, res);
  }

  @Get('pm/email-settings/logo/:uuid/:filename')
  async getPmEmailLogo(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.getPublicAssetUseCase.execute(`pm/${uuid}/email-settings/${filename}`, res);
  }

  @Get('pm/receipt-settings/logo/:uuid/:filename')
  async getPmReceiptLogo(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.getPublicAssetUseCase.execute(`pm/${uuid}/receipt-settings/${filename}`, res);
  }

  @Get('relays/:uuid/download')
  async getRelayDocument(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    return this.getRelayDocumentUseCase.execute(uuid, res);
  }

  @Get('payment-proofs/:uuid/file')
  async getPaymentProofFile(@Param('uuid') uuid: string, @Res({ passthrough: true }) res: any) {
    return this.getPaymentProofUseCase.execute(uuid, res);
  }

  @Get('users/payment-proofs/:uuid/:filename')
  async getUserPaymentProof(@Param('uuid') uuid: string, @Param('filename') filename: string, @Res({ passthrough: true }) res: any) {
    return this.getPublicAssetUseCase.execute(`users/${uuid}/payment-proofs/${filename}`, res);
  }
}
