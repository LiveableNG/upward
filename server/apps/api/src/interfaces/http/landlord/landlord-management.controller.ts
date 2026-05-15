import { Controller, Post, Get, Patch, Body, UseGuards, Req, Param, Inject, UnauthorizedException, NotFoundException, BadRequestException, Delete, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { CreatePmPaymentRequestUseCase, CreatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/create-pm-payment-request.use-case';
import { UpdatePmPaymentRequestUseCase, UpdatePmPaymentRequestDto } from '../../../application/pm/use-cases/payments/update-pm-payment-request.use-case';
import { GetPmPaymentRequestsUseCase } from '../../../application/pm/use-cases/payments/get-pm-payment-requests.use-case';
import { CreatePropertyUseCase } from '../../../application/pm/use-cases/create-property.use-case';
import { BulkCreateUnitsUseCase } from '../../../application/pm/use-cases/bulk-create-units.use-case';
import { GetPmPropertiesUseCase } from '../../../application/pm/use-cases/get-pm-properties.use-case';
import { GetPmUnitsUseCase } from '../../../application/pm/use-cases/get-pm-units.use-case';
import { SyncUnitToUpwardUseCase } from '../../../application/pm/use-cases/units/sync-unit.use-case';
import { UpdatePmBankInfoUseCase } from '../../../application/use-cases/pm/update-pm-bank-info.use-case';
import { VerifyAccountUseCase, GetBanksUseCase } from '../../../application/use-cases/payments/payment.use-cases';

@Controller('landlords/management')
@UseGuards(JwtAuthGuard)
export class LandlordManagementController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
    private readonly createPropertyUseCase: CreatePropertyUseCase,
    private readonly bulkCreateUnitsUseCase: BulkCreateUnitsUseCase,
    private readonly createPaymentRequestUseCase: CreatePmPaymentRequestUseCase,
    private readonly updatePaymentRequestUseCase: UpdatePmPaymentRequestUseCase,
    private readonly getPaymentRequestsUseCase: GetPmPaymentRequestsUseCase,
    private readonly getPropertiesUseCase: GetPmPropertiesUseCase,
    private readonly getUnitsUseCase: GetPmUnitsUseCase,
    private readonly syncUnitUseCase: SyncUnitToUpwardUseCase,
    private readonly updateBankInfoUseCase: UpdatePmBankInfoUseCase,
    private readonly verifyAccountUseCase: VerifyAccountUseCase,
    private readonly getBanksUseCase: GetBanksUseCase,
  ) {}

  /**
   * Helper to ensure the Landlord has a PM profile and return the ID.
   * This is the "Shadow PM" bridge.
   */
  private async getElevatedPmId(req: any): Promise<number> {
    const email = req.user?.email;
    if (!email) throw new UnauthorizedException('Invalid landlord context');

    // 1. Find or Create a PM profile for this Landlord email
    let pm = await this.pmRepository.findByEmail(email);
    
    if (!pm) {
      // Auto-elevate landlord to a managing PM profile if they don't have one
      const landlord = await this.prisma.upward_pm_landlord.findUnique({
        where: { emailHash: this.hashEmail(email) }
      });
      
      if (!landlord) throw new UnauthorizedException('Landlord record not found');

      const newPm = await this.prisma.upward_property_manager.create({
        data: {
          email: email,
          emailHash: this.hashEmail(email),
          passwordHash: landlord.passwordHash, // Sync password
          firstName: landlord.firstName || 'Landlord',
          lastName: landlord.lastName || 'User',
          businessName: `${landlord.firstName}'s Portfolio`,
          pmType: 'INDIVIDUAL_LANDLORD'
        }
      });
      return newPm.id;
    }

    return pm.id!;
  }

  private hashEmail(email: string): string {
    return require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  @Post('properties')
  async createProperty(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.createPropertyUseCase.execute(pmId, dto);
  }

  @Get('properties')
  async getProperties(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPropertiesUseCase.execute(pmId);
  }

  @Post('units/bulk')
  async createUnits(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.bulkCreateUnitsUseCase.execute(pmId, dto);
  }

  @Get('units')
  async getUnits(@Req() req: any, @Query('propertyUuid') propertyUuid?: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.getUnitsUseCase.execute(pmId, propertyUuid);
  }

  @Post('payment-requests')
  async createPaymentRequest(@Req() req: any, @Body() dto: CreatePmPaymentRequestDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.createPaymentRequestUseCase.execute(pmId, dto);
  }

  @Patch('payment-requests/:uuid')
  async updatePaymentRequest(@Req() req: any, @Param('uuid') uuid: string, @Body() dto: UpdatePmPaymentRequestDto) {
    const pmId = await this.getElevatedPmId(req);
    return this.updatePaymentRequestUseCase.execute(pmId, uuid, dto);
  }

  @Get('payment-requests')
  async getPaymentRequests(@Req() req: any) {
    const pmId = await this.getElevatedPmId(req);
    return this.getPaymentRequestsUseCase.execute(pmId);
  }

  @Post('units/:unitUuid/sync')
  async syncUnit(@Req() req: any, @Param('unitUuid') unitUuid: string) {
    const pmId = await this.getElevatedPmId(req);
    return this.syncUnitUseCase.execute(unitUuid, pmId);
  }

  @Patch('profile/bank-info')
  async updateBankInfo(@Req() req: any, @Body() dto: any) {
    const pmId = await this.getElevatedPmId(req);
    // Find pm uuid first
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: pmId } });
    if (!pm) throw new NotFoundException('PM record not found');
    return this.updateBankInfoUseCase.execute(pm.uuid, dto);
  }

  @Post('profile/verify-bank')
  async verifyBank(@Req() req: any, @Body() dto: { accountNumber: string, bankCode: string }) {
    await this.getElevatedPmId(req); // Just for auth check
    return this.verifyAccountUseCase.execute(dto.accountNumber, dto.bankCode);
  }

  @Get('profile/banks')
  async getBanks(@Req() req: any) {
    await this.getElevatedPmId(req); // Just for auth check
    return this.getBanksUseCase.execute();
  }
}
