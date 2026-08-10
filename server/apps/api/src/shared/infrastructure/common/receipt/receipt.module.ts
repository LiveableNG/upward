import { Module } from '@nestjs/common'
import { ReceiptService } from './receipt.service'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [S3Module],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class ReceiptModule {}
