import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  getProcessingFee(): number {
    return this.configService.get<number>('PAYMENT_PROCESSING_FEE') || 2000;
  }

  getGatewayFee(): number {
    return this.configService.get<number>('PAYMENT_GATEWAY_FEE') || 300;
  }

  getNetRevenuePerTransaction(): number {
    return this.getProcessingFee() - this.getGatewayFee();
  }

  getMinPaymentAmount(): number {
    return this.configService.get<number>('MIN_PAYMENT_AMOUNT') || 1000;
  }
}
