import { RentalPeriodService } from '../../../src/application/services/rental-period.service';

describe('RentalPeriodService', () => {
  let service: RentalPeriodService;

  beforeEach(() => {
    service = new RentalPeriodService();
  });

  describe('parseCalendarDate', () => {
    it('should normalize a date string "2026-09-13" to UTC midnight', () => {
      const parsed = service.parseCalendarDate('2026-09-13');
      expect(parsed).not.toBeNull();
      expect(parsed!.toISOString()).toBe('2026-09-13T00:00:00.000Z');
      expect(parsed!.getUTCHours()).toBe(0);
      expect(parsed!.getUTCMinutes()).toBe(0);
      expect(parsed!.getUTCSeconds()).toBe(0);
      expect(parsed!.getUTCMilliseconds()).toBe(0);
    });

    it('should normalize an ISO timestamp string to UTC midnight', () => {
      const parsed = service.parseCalendarDate('2026-09-12T23:00:00.000Z');
      expect(parsed).not.toBeNull();
      expect(parsed!.toISOString()).toBe('2026-09-12T00:00:00.000Z');
    });

    it('should normalize a Date object to UTC midnight', () => {
      const d = new Date('2026-09-13T15:30:00.000Z');
      const parsed = service.parseCalendarDate(d);
      expect(parsed).not.toBeNull();
      expect(parsed!.toISOString()).toBe('2026-09-13T00:00:00.000Z');
    });

    it('should return null for null or undefined input', () => {
      expect(service.parseCalendarDate(null)).toBeNull();
      expect(service.parseCalendarDate(undefined)).toBeNull();
    });
  });

  describe('calculatePeriodEnd', () => {
    it('should calculate annual period end as exactly 1 year minus 1 day', () => {
      const end = service.calculatePeriodEnd('2026-09-13', 'Annually');
      expect(end.toISOString()).toBe('2027-09-12T00:00:00.000Z');
    });

    it('should calculate monthly period end as 1 month minus 1 day', () => {
      const end = service.calculatePeriodEnd('2026-01-01', 'Monthly');
      expect(end.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    });
  });

  describe('calculateNextPeriod', () => {
    it('should correctly calculate the next annual rental period in pure UTC midnight', () => {
      const currentStart = new Date('2026-03-15T00:00:00.000Z');
      const currentEnd = new Date('2027-03-14T00:00:00.000Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Annually');

      expect(next.nextStart.toISOString()).toBe('2027-03-15T00:00:00.000Z');
      expect(next.nextEnd.toISOString()).toBe('2028-03-14T00:00:00.000Z');
      expect(next.nextStart.getTime()).toBeLessThan(next.nextEnd.getTime());
    });

    it('should correctly calculate the next monthly rental period in pure UTC midnight', () => {
      const currentStart = new Date('2026-01-01T00:00:00.000Z');
      const currentEnd = new Date('2026-01-31T00:00:00.000Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Monthly');

      expect(next.nextStart.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      expect(next.nextEnd.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    });

    it('should correctly calculate a multi-year lease period in pure UTC midnight', () => {
      const currentStart = new Date('2025-01-01T00:00:00.000Z');
      const currentEnd = new Date('2026-12-31T00:00:00.000Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Lease', 2);

      expect(next.nextStart.toISOString()).toBe('2027-01-01T00:00:00.000Z');
      expect(next.nextEnd.toISOString()).toBe('2028-12-31T00:00:00.000Z');
    });
  });

  describe('resolveTargetRentalPeriod', () => {
    it('should resolve to CURRENT period when amountRemaining > 0', () => {
      const result = service.resolveTargetRentalPeriod({
        rentStartDate: '2026-09-13',
        rentEndDate: '2027-09-12',
        rentType: 'Annually',
        amountRemaining: 250000,
        isFirstRent: false,
      });

      expect(result.periodStart.toISOString()).toBe('2026-09-13T00:00:00.000Z');
      expect(result.periodEnd.toISOString()).toBe('2027-09-12T00:00:00.000Z');
      expect(result.isAdvance).toBe(false);
    });

    it('should resolve to CURRENT period when isFirstRent=true even if amountRemaining is 0 initially', () => {
      const result = service.resolveTargetRentalPeriod({
        rentStartDate: '2026-09-13',
        rentEndDate: '2027-09-12',
        rentType: 'Annually',
        amountRemaining: 0,
        isFirstRent: true,
      });

      expect(result.periodStart.toISOString()).toBe('2026-09-13T00:00:00.000Z');
      expect(result.periodEnd.toISOString()).toBe('2027-09-12T00:00:00.000Z');
      expect(result.isAdvance).toBe(false);
    });

    it('should resolve to NEXT period when amountRemaining=0 and isFirstRent=false', () => {
      const result = service.resolveTargetRentalPeriod({
        rentStartDate: '2026-09-13',
        rentEndDate: '2027-09-12',
        rentType: 'Annually',
        amountRemaining: 0,
        isFirstRent: false,
      });

      expect(result.periodStart.toISOString()).toBe('2027-09-13T00:00:00.000Z');
      expect(result.periodEnd.toISOString()).toBe('2028-09-12T00:00:00.000Z');
      expect(result.isAdvance).toBe(true);
    });
  });

  describe('initializeRentalState', () => {
    const rentStartDate = new Date('2026-03-15T00:00:00.000Z');
    const rentEndDate = new Date('2027-03-14T00:00:00.000Z');
    const rentAmount = 100000;

    it('should initialize a brand new unpaid cycle (isFirstRent=true, initialPaid=0)', () => {
      const state = service.initializeRentalState({
        rentStartDate,
        rentEndDate,
        rentAmount,
        rentType: 'Annually',
        initialAmountPaid: 0,
        isFirstRent: true,
      });

      expect(state.isFirstRent).toBe(true);
      expect(state.amountPaid).toBe(0);
      expect(state.amountRemaining).toBe(100000);
      expect(state.amountPaid + state.amountRemaining).toBe(rentAmount);
      expect(state.initialAmountPaid).toBe(0);
      expect(state.rentStartDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
      expect(state.rentEndDate.toISOString()).toBe('2027-03-14T00:00:00.000Z');
    });

    it('should initialize a partially paid cycle (initialPaid=30000)', () => {
      const state = service.initializeRentalState({
        rentStartDate,
        rentEndDate,
        rentAmount,
        rentType: 'Annually',
        initialAmountPaid: 30000,
        isFirstRent: true,
      });

      expect(state.isFirstRent).toBe(true);
      expect(state.amountPaid).toBe(30000);
      expect(state.amountRemaining).toBe(70000);
      expect(state.amountPaid + state.amountRemaining).toBe(rentAmount);
      expect(state.initialAmountPaid).toBe(30000);
    });

    it('should mark settled when onboarded as fully pre-paid (initialPaid >= rentAmount)', () => {
      const state = service.initializeRentalState({
        rentStartDate,
        rentEndDate,
        rentAmount,
        rentType: 'Annually',
        initialAmountPaid: 100000,
      });

      expect(state.isFirstRent).toBe(false);
      expect(state.amountPaid).toBe(100000);
      expect(state.amountRemaining).toBe(0);
      expect(state.amountPaid + state.amountRemaining).toBe(rentAmount);
      expect(state.initialAmountPaid).toBe(100000);
    });
  });

  describe('processRentPayment', () => {
    it('Scenario 1: Fresh tenant with partial payments followed by next cycle renewal', async () => {
      let propertyInDb: any = {
        id: 1,
        rentAmount: 100000,
        rentStartDate: new Date('2026-03-15T00:00:00.000Z'),
        rentEndDate: new Date('2027-03-14T00:00:00.000Z'),
        rentType: 'Annually',
        amountPaid: 0,
        amountRemaining: 100000,
        isFirstRent: true,
      };

      const mockTxClient = {
        upward_user_property: {
          findUnique: jest.fn().mockImplementation(() => Promise.resolve(propertyInDb)),
          update: jest.fn().mockImplementation(({ data }) => {
            propertyInDb = { ...propertyInDb, ...data };
            return Promise.resolve(propertyInDb);
          }),
        },
        upward_platform_rent_payment: {
          create: jest.fn().mockResolvedValue({ id: 10 }),
        },
      };

      // Step 1: Tenant makes partial payment of 30,000 (applies to current period, isFirstRent stays true)
      const payment1 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 30000,
        txClient: mockTxClient,
      });

      expect(payment1.periodStart.toISOString()).toBe('2026-03-15T00:00:00.000Z');
      expect(payment1.periodEnd.toISOString()).toBe('2027-03-14T00:00:00.000Z');
      expect(payment1.isFullySettled).toBe(false);
      expect(payment1.isAdvancing).toBe(false);
      expect(propertyInDb.amountPaid).toBe(30000);
      expect(propertyInDb.amountRemaining).toBe(70000);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(100000);
      expect(propertyInDb.isFirstRent).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');

      // Step 2: Tenant completes remaining 70,000 for the first cycle (isFirstRent becomes false, dates do NOT advance)
      const payment2 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 70000,
        txClient: mockTxClient,
      });

      expect(payment2.periodStart.toISOString()).toBe('2026-03-15T00:00:00.000Z');
      expect(payment2.periodEnd.toISOString()).toBe('2027-03-14T00:00:00.000Z');
      expect(payment2.isFullySettled).toBe(true);
      expect(payment2.isAdvancing).toBe(false);
      expect(propertyInDb.amountPaid).toBe(100000);
      expect(propertyInDb.amountRemaining).toBe(0);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(100000);
      expect(propertyInDb.isFirstRent).toBe(false);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');

      // Step 3: Next cycle renewal payment of 100,000 (advances to 2027-03-15 -> 2028-03-14)
      const payment3 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 100000,
        txClient: mockTxClient,
      });

      expect(payment3.periodStart.toISOString()).toBe('2027-03-15T00:00:00.000Z');
      expect(payment3.periodEnd.toISOString()).toBe('2028-03-14T00:00:00.000Z');
      expect(payment3.isFullySettled).toBe(true);
      expect(payment3.isAdvancing).toBe(true);
      expect(propertyInDb.amountPaid).toBe(100000);
      expect(propertyInDb.amountRemaining).toBe(0);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(100000);
      expect(propertyInDb.isFirstRent).toBe(false);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2027-03-15T00:00:00.000Z');
    });

    it('Scenario 2: Pre-paid onboarding must cleanly advance to next cycle on first incoming payment', async () => {
      // 2026-2027 was pre-paid, so active period is 2026-2027 with amountRemaining=0, isFirstRent=false
      let propertyInDb: any = {
        id: 2,
        rentAmount: 200,
        rentStartDate: new Date('2026-03-15T00:00:00.000Z'),
        rentEndDate: new Date('2027-03-14T00:00:00.000Z'),
        rentType: 'Annually',
        amountPaid: 200,
        amountRemaining: 0,
        isFirstRent: false,
      };

      const mockTxClient = {
        upward_user_property: {
          findUnique: jest.fn().mockImplementation(() => Promise.resolve(propertyInDb)),
          update: jest.fn().mockImplementation(({ data }) => {
            propertyInDb = { ...propertyInDb, ...data };
            return Promise.resolve(propertyInDb);
          }),
        },
        upward_platform_rent_payment: {
          create: jest.fn().mockResolvedValue({ id: 20 }),
        },
      };

      // First live payment of 200: advances from 2026-2027 to 2027-2028
      const payment1 = await service.processRentPayment({
        userId: 2,
        propertyId: 2,
        rentPortion: 200,
        txClient: mockTxClient,
      });

      expect(payment1.periodStart.toISOString()).toBe('2027-03-15T00:00:00.000Z');
      expect(payment1.periodEnd.toISOString()).toBe('2028-03-14T00:00:00.000Z');
      expect(payment1.isFullySettled).toBe(true);
      expect(payment1.isAdvancing).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2027-03-15T00:00:00.000Z');

      // Second live payment of 200: advances from 2027-2028 to 2028-2029
      const payment2 = await service.processRentPayment({
        userId: 2,
        propertyId: 2,
        rentPortion: 200,
        txClient: mockTxClient,
      });

      expect(payment2.periodStart.toISOString()).toBe('2028-03-15T00:00:00.000Z');
      expect(payment2.periodEnd.toISOString()).toBe('2029-03-14T00:00:00.000Z');
      expect(payment2.isFullySettled).toBe(true);
      expect(payment2.isAdvancing).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2028-03-15T00:00:00.000Z');
    });

    it('Scenario 3: Multi-step partial payments against upcoming cycle', async () => {
      // Property currently on 2026-2027 settled
      let propertyInDb: any = {
        id: 41,
        rentAmount: 750000,
        rentStartDate: new Date('2026-09-19T00:00:00.000Z'),
        rentEndDate: new Date('2027-09-18T00:00:00.000Z'),
        rentType: 'Annually',
        amountPaid: 750000,
        amountRemaining: 0,
        isFirstRent: false,
      };

      const prRecord = {
        id: 32,
        rentStartDate: new Date('2027-09-19T00:00:00.000Z'),
        rentEndDate: new Date('2028-09-18T00:00:00.000Z'),
        amount: 750000,
      };

      const mockTxClient = {
        upward_user_property: {
          findUnique: jest.fn().mockImplementation(() => Promise.resolve(propertyInDb)),
          update: jest.fn().mockImplementation(({ data }) => {
            propertyInDb = { ...propertyInDb, ...data };
            return Promise.resolve(propertyInDb);
          }),
        },
        upward_payment_request: {
          findUnique: jest.fn().mockImplementation(() => Promise.resolve(prRecord)),
          update: jest.fn().mockResolvedValue({}),
        },
        upward_platform_rent_payment: {
          create: jest.fn().mockResolvedValue({ id: 41 }),
        },
      };

      // Payment 1: 400,000 against PR 32 (advances to 2027-2028, remaining 350,000)
      const p1 = await service.processRentPayment({
        userId: 33,
        propertyId: 41,
        rentPortion: 400000,
        paymentRequestId: 32,
        txClient: mockTxClient,
      });

      expect(p1.periodStart.toISOString()).toBe('2027-09-19T00:00:00.000Z');
      expect(p1.periodEnd.toISOString()).toBe('2028-09-18T00:00:00.000Z');
      expect(p1.isFullySettled).toBe(false);
      expect(propertyInDb.amountPaid).toBe(400000);
      expect(propertyInDb.amountRemaining).toBe(350000);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(750000);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2027-09-19T00:00:00.000Z');

      // Payment 2: 200,000 (stays on 2027-2028, remaining 150,000)
      const p2 = await service.processRentPayment({
        userId: 33,
        propertyId: 41,
        rentPortion: 200000,
        paymentRequestId: 32,
        txClient: mockTxClient,
      });

      expect(p2.periodStart.toISOString()).toBe('2027-09-19T00:00:00.000Z');
      expect(p2.periodEnd.toISOString()).toBe('2028-09-18T00:00:00.000Z');
      expect(p2.isFullySettled).toBe(false);
      expect(propertyInDb.amountPaid).toBe(600000);
      expect(propertyInDb.amountRemaining).toBe(150000);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(750000);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2027-09-19T00:00:00.000Z');

      // Payment 3: 150,000 final balance (completes 2027-2028, dates stay on 2027-2028)
      const p3 = await service.processRentPayment({
        userId: 33,
        propertyId: 41,
        rentPortion: 150000,
        paymentRequestId: 32,
        txClient: mockTxClient,
      });

      expect(p3.periodStart.toISOString()).toBe('2027-09-19T00:00:00.000Z');
      expect(p3.periodEnd.toISOString()).toBe('2028-09-18T00:00:00.000Z');
      expect(p3.isFullySettled).toBe(true);
      expect(propertyInDb.amountPaid).toBe(750000);
      expect(propertyInDb.amountRemaining).toBe(0);
      expect(propertyInDb.amountPaid + propertyInDb.amountRemaining).toBe(750000);
      expect(propertyInDb.isFirstRent).toBe(false);
      expect(propertyInDb.rentStartDate.toISOString()).toBe('2027-09-19T00:00:00.000Z');
    });
  });
});
