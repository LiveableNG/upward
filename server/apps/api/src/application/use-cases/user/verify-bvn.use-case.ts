import { Injectable } from '@nestjs/common'
import { VerifyKycUseCase } from './verify-kyc.use-case'

@Injectable()
export class VerifyBvnUseCase {
  constructor(private readonly verifyKycUseCase: VerifyKycUseCase) {}

  async execute(userUuid: string, bvn: string) {
    return this.verifyKycUseCase.execute(userUuid, {
      type: 'BVN',
      idNumber: bvn,
    })
  }
}
