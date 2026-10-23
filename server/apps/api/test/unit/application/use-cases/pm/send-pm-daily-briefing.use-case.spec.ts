import { SendPmDailyBriefingUseCase, getLagosYesterdayRange } from '../../../../../src/application/pm/use-cases/send-pm-daily-briefing.use-case';

describe('SendPmDailyBriefingUseCase', () => {
  let useCase: SendPmDailyBriefingUseCase;
  let mockPrisma: any;
  let mockEncryption: any;
  let mockUnifiedCommService: any;

  beforeEach(() => {
    mockPrisma = {
      upward_property_manager: {
        findMany: jest.fn(),
      },
      upward_pm_rent_payment: {
        findMany: jest.fn(),
      },
      upward_pm_tenant: {
        findMany: jest.fn(),
      },
      upward_pm_bulk_invite: {
        count: jest.fn(),
      },
      upward_tenant_join_request: {
        findMany: jest.fn(),
      },
      upward_credibility_request: {
        findMany: jest.fn(),
      },
      upward_pm_approval_request: {
        findMany: jest.fn(),
      },
      upward_pm_employee: {
        count: jest.fn(),
      },
      upward_pm_activity_log: {
        findMany: jest.fn(),
      },
      upward_pm_unit: {
        findMany: jest.fn(),
      },
    };

    mockEncryption = {
      decrypt: jest.fn((val: string) => val ? val.replace('enc_', '') : ''),
      encrypt: jest.fn((val: string) => `enc_${val}`),
      hash: jest.fn((val: string) => `hash_${val}`),
    };

    mockUnifiedCommService = {
      processCommunication: jest.fn().mockResolvedValue(true),
    };

    useCase = new SendPmDailyBriefingUseCase(
      mockPrisma as any,
      mockEncryption as any,
      mockUnifiedCommService as any,
    );
  });

  describe('Timezone Boundary Calculation (getLagosYesterdayRange)', () => {
    it('should correctly calculate Lagos calendar boundaries for yesterday', () => {
      // 2026-10-20 at 08:30 Lagos time is 2026-10-20 at 07:30 UTC
      const fixedNow = new Date('2026-10-20T07:30:00.000Z');
      const { startOfYesterday, startOfToday, endOfYesterday, yesterdayFormatted } = getLagosYesterdayRange(fixedNow);

      // Lagos startOfToday should be 2026-10-20 00:00:00 Lagos (2026-10-19 23:00:00 UTC)
      expect(startOfToday.toISOString()).toBe('2026-10-19T23:00:00.000Z');

      // Lagos startOfYesterday should be 2026-10-19 00:00:00 Lagos (2026-10-18 23:00:00 UTC)
      expect(startOfYesterday.toISOString()).toBe('2026-10-18T23:00:00.000Z');

      // End of yesterday is 1 millisecond before start of today
      expect(endOfYesterday.getTime()).toBe(startOfToday.getTime() - 1);

      // Human-readable formatted string should reflect Monday 19 Oct 2026
      expect(yesterdayFormatted).toContain('Monday');
      expect(yesterdayFormatted).toContain('19');
      expect(yesterdayFormatted).toContain('Oct');
    });
  });

  describe('Preference Enforcement', () => {
    it('should skip PMs who have dailyBriefingEnabled set to false', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 1,
          uuid: 'pm-opted-out',
          email: 'enc_optout@example.com',
          businessName: 'enc_OptOut Corp',
          dailyBriefingEnabled: false,
        },
      ]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).not.toHaveBeenCalled();
      expect(result.sentCount).toBe(0);
      expect(result.totalEligible).toBe(1);
    });
  });

  describe('Zero-Activity Suppression', () => {
    it('should suppress briefing email when a PM had 0 collections, 0 onboarded tenants, 0 pending actions, 0 staff actions, and 0 rent alerts', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 10,
          uuid: 'pm-quiet',
          email: 'enc_quiet@example.com',
          firstName: 'enc_Jane',
          lastName: 'enc_Doe',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);
      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).not.toHaveBeenCalled();
      expect(result.sentCount).toBe(0);
      expect(result.suppressedCount).toBe(1);
    });
  });

  describe('Payment Aggregation & Data Accuracy', () => {
    it('should accurately aggregate collections from yesterday and dispatch briefing', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 20,
          uuid: 'pm-active',
          email: 'enc_active@domain.com',
          businessName: 'enc_Prime Properties',
          dailyBriefingEnabled: true,
        },
      ]);

      // Two successful payments yesterday
      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([
        {
          id: 101,
          amount: 250000,
          status: 'SUCCESS',
          paymentDate: new Date('2026-10-19T10:00:00.000Z'),
          method: 'Paystack',
          unit: { unitName: 'Flat 4B', property: { name: 'Sunset Palms' } },
          tenant: { firstNameEncrypted: 'enc_John', lastNameEncrypted: 'enc_Smith' },
        },
        {
          id: 102,
          amount: 150000,
          status: 'SUCCESS',
          paymentDate: new Date('2026-10-19T14:30:00.000Z'),
          method: 'Bank Transfer',
          unit: { unitName: 'Suite 2', property: { name: 'Sunset Palms' } },
          tenant: { commercialNameEncrypted: 'enc_Apex Law Chambers' },
        },
      ]);

      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);
      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).toHaveBeenCalledTimes(1);
      const callArg = mockUnifiedCommService.processCommunication.mock.calls[0][0];

      expect(callArg.recipientEmail).toBe('active@domain.com');
      expect(callArg.type).toBe('PM_DAILY_BRIEFING');
      expect(callArg.context.title).toContain('₦400,000 Collected');
      expect(callArg.context.htmlOverride).toContain('Flat 4B');
      expect(callArg.context.htmlOverride).toContain('Sunset Palms');
      expect(callArg.context.htmlOverride).toContain('Apex Law Chambers');
      expect(result.sentCount).toBe(1);
    });
  });

  describe('Tenant Onboarding Reporting', () => {
    it('should report newly accepted invites using inviteAcceptedAt', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 30,
          uuid: 'pm-onboard',
          email: 'enc_pm@onboard.com',
          firstName: 'enc_Alice',
          lastName: 'enc_Johnson',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      // 1 tenant accepted invite yesterday
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([
        {
          id: 501,
          firstNameEncrypted: 'enc_Emeka',
          lastNameEncrypted: 'enc_Okafor',
          inviteAcceptedAt: new Date('2026-10-19T16:00:00.000Z'),
          units: [{ unitName: 'Unit 12', property: { name: 'Royal Court' } }],
        },
      ]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);
      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).toHaveBeenCalledTimes(1);
      const html = mockUnifiedCommService.processCommunication.mock.calls[0][0].context.htmlOverride;
      expect(html).toContain('Emeka Okafor');
      expect(html).toContain('Royal Court');
      expect(html).toContain('Connected');
      expect(result.sentCount).toBe(1);
    });
  });

  describe('Role-Aware Employee Activity Reporting', () => {
    it('should query and include employee activity only when PM has employees', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 40,
          uuid: 'pm-team-lead',
          email: 'enc_lead@team.com',
          businessName: 'enc_Grand Realty',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);

      // PM has 2 employees
      mockPrisma.upward_pm_employee.count.mockResolvedValue(2);
      mockPrisma.upward_pm_activity_log.findMany.mockResolvedValue([
        {
          id: 99,
          action: 'CREATE_UNIT',
          description: 'Added Unit 3B to Grand Court',
          employee: {
            firstName: 'enc_David',
            lastName: 'enc_Bello',
            jobTitle: 'Property Officer',
          },
        },
      ]);

      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockPrisma.upward_pm_activity_log.findMany).toHaveBeenCalled();
      const html = mockUnifiedCommService.processCommunication.mock.calls[0][0].context.htmlOverride;
      expect(html).toContain('David Bello');
      expect(html).toContain('Property Officer');
      expect(html).toContain('Added Unit 3B to Grand Court');
      expect(result.sentCount).toBe(1);
    });

    it('should not query upward_pm_activity_log when PM has 0 employees', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 41,
          uuid: 'pm-solo',
          email: 'enc_solo@domain.com',
          firstName: 'enc_Solo',
          lastName: 'enc_User',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([
        { id: 1, address: 'Plot 4, Lekki', user: { firstName: 'enc_Tim', lastName: 'enc_Lee' } },
      ]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);

      // 0 employees
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);
      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockPrisma.upward_pm_activity_log.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Urgent Rent Alerts (Upcoming & Overdue)', () => {
    it('should include overdue and upcoming rent alerts', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 50,
          uuid: 'pm-alerts',
          email: 'enc_pm@alerts.com',
          firstName: 'enc_Sam',
          lastName: 'enc_Alert',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);

      // Now is 2026-10-20
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1); // 1 day overdue
      const in3Days = new Date(now);
      in3Days.setDate(in3Days.getDate() + 3); // in 3 days

      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([
        {
          unitName: 'Unit 5',
          rentAmount: 300000,
          rentDueDate: yesterday,
          property: { name: 'Green Estate' },
          tenant: { firstNameEncrypted: 'enc_Tunde', lastNameEncrypted: 'enc_Bakare' },
        },
        {
          unitName: 'Unit 8',
          rentAmount: 450000,
          rentDueDate: in3Days,
          property: { name: 'Green Estate' },
          tenant: { firstNameEncrypted: 'enc_Grace', lastNameEncrypted: 'enc_Kalu' },
        },
      ]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).toHaveBeenCalledTimes(1);
      const html = mockUnifiedCommService.processCommunication.mock.calls[0][0].context.htmlOverride;
      expect(html).toContain('Tunde Bakare');
      expect(html).toContain('1 day overdue');
      expect(html).toContain('Grace Kalu');
      expect(html).toContain('In 3 days');
      expect(result.sentCount).toBe(1);
    });

    it('should include pending credibility requests with direct public fulfillment links', async () => {
      mockPrisma.upward_property_manager.findMany.mockResolvedValue([
        {
          id: 60,
          uuid: 'pm-credibility',
          email: 'enc_pm@liveable.ng',
          firstName: 'enc_Liveable',
          lastName: 'enc_Admin',
          dailyBriefingEnabled: true,
        },
      ]);

      mockPrisma.upward_pm_rent_payment.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_tenant.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_bulk_invite.count.mockResolvedValue(0);
      mockPrisma.upward_tenant_join_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_credibility_request.findMany.mockResolvedValue([
        {
          id: 7,
          uuid: 'bea6ae8a-0501-4c1c-8ed5-2b0e44a6cdd4',
          email: 'enc_pm@liveable.ng',
          user: {
            firstName: 'enc_Ireti',
            lastName: 'enc_Adebayo',
          },
        },
      ]);
      mockPrisma.upward_pm_approval_request.findMany.mockResolvedValue([]);
      mockPrisma.upward_pm_employee.count.mockResolvedValue(0);
      mockPrisma.upward_pm_unit.findMany.mockResolvedValue([]);

      const result = await useCase.execute(new Date('2026-10-20T07:30:00.000Z'));

      expect(mockUnifiedCommService.processCommunication).toHaveBeenCalledTimes(1);
      const html = mockUnifiedCommService.processCommunication.mock.calls[0][0].context.htmlOverride;
      expect(html).toContain('Ireti Adebayo');
      expect(html).toContain('Requested Rent History Verification');
      expect(html).toContain('/public/requests/bea6ae8a-0501-4c1c-8ed5-2b0e44a6cdd4');
      expect(result.sentCount).toBe(1);
    });
  });
});

