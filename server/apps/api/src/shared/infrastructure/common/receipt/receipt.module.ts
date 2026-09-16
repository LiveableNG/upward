import { Module } from '@nestjs/common'
import { ReceiptService } from './receipt.service'
import { RentDepositReceiptService } from './rent-deposit-receipt.service'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [S3Module],
  providers: [ReceiptService, RentDepositReceiptService],
  exports: [ReceiptService, RentDepositReceiptService],
})
export class ReceiptModule {}
