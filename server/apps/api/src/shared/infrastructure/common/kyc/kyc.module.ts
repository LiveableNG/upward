import { Module } from '@nestjs/common'
import { KYCReportPdfService } from './kyc-report-pdf.service'

@Module({
  providers: [KYCReportPdfService],
  exports: [KYCReportPdfService],
})
export class KYCModule {}
