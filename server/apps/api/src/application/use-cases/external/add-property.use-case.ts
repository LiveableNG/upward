import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { SingleInviteUseCase } from './single-invite.use-case'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { CompanyRepository, COMPANY_REPOSITORY } from '../../../domains/companies/company.repository'
import { AddPropertyPayloadDto } from './external-api.dto'

@Injectable()
export class AddPropertyUseCase {
  private readonly logger = new Logger(AddPropertyUseCase.name)

  constructor(
    private readonly singleInviteUseCase: SingleInviteUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
  ) { }

  async execute(payload: AddPropertyPayloadDto, platformId?: number): Promise<any> {
    const user = await this.userRepository.findByUuid(payload.userUuid)
    if (!user) {
      throw new NotFoundException(`User with UUID ${payload.userUuid} not found`)
    }

    const company = await this.companyRepository.findByUuid(payload.companyUuid)
    if (!company) {
      throw new NotFoundException(`Company with UUID ${payload.companyUuid} not found`)
    }


    const result = await this.singleInviteUseCase.processProperties(user, company, payload.properties as any, platformId)

    return {
      userId: user.uuid,
      companyId: company.uuid,
      email: user.email,
      properties: result.map(p => ({
        uuid: p.uuid,
        address: p.address,
        managerUuid: p.managerUuid
      }))
    }
  }
}
