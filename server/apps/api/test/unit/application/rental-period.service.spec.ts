import { RentalPeriodService } from '../../../src/application/services/rental-period.service';

describe('RentalPeriodService', () => {
  let service: RentalPeriodService;

  beforeEach(() => {
    service = new RentalPeriodService();
  });

  describe('calculateNextPeriod', () => {
    it('should correctly calculate the next annual rental period', () => {
      const currentStart = new Date('2026-03-15T00:00:00.000Z');
      const currentEnd = new Date('2027-03-14T23:59:59.999Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Annually');

      expect(next.nextStart.toISOString().split('T')[0]).toBe('2027-03-15');
      expect(next.nextEnd.toISOString().split('T')[0]).toBe('2028-03-14');
    });

    it('should correctly calculate the next monthly rental period', () => {
      const currentStart = new Date('2026-01-01T00:00:00.000Z');
      const currentEnd = new Date('2026-01-31T23:59:59.999Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Monthly');

      expect(next.nextStart.toISOString().split('T')[0]).toBe('2026-02-01');
      expect(next.nextEnd.toISOString().split('T')[0]).toBe('2026-02-28');
    });

    it('should correctly calculate a multi-year lease period', () => {
      const currentStart = new Date('2025-01-01T00:00:00.000Z');
      const currentEnd = new Date('2026-12-31T23:59:59.999Z');
      const next = service.calculateNextPeriod(currentStart, currentEnd, 'Lease', 2);

      expect(next.nextStart.toISOString().split('T')[0]).toBe('2027-01-01');
      expect(next.nextEnd.toISOString().split('T')[0]).toBe('2028-12-31');
    });
  });

  describe('initializeRentalState', () => {
    const rentStartDate = new Date('2026-03-15T00:00:00.000Z');
    const rentEndDate = new Date('2027-03-14T23:59:59.999Z');
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
      expect(state.initialAmountPaid).toBe(0);
      expect(state.rentStartDate.toISOString().split('T')[0]).toBe('2026-03-15');
      expect(state.rentEndDate.toISOString().split('T')[0]).toBe('2027-03-14');
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
      expect(state.initialAmountPaid).toBe(30000);
      expect(state.rentStartDate.toISOString().split('T')[0]).toBe('2026-03-15');
      expect(state.rentEndDate.toISOString().split('T')[0]).toBe('2027-03-14');
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
      expect(state.initialAmountPaid).toBe(100000);
    });
  });

  describe('processRentPayment', () => {
    it('Scenario 1: Fresh tenant with partial payments followed by next cycle renewal', async () => {
      let propertyInDb: any = {
        id: 1,
        rentAmount: 100000,
        rentStartDate: new Date('2026-03-15T00:00:00.000Z'),
        rentEndDate: new Date('2027-03-14T23:59:59.999Z'),
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

      // Step 1: Tenant makes partial payment of 30,000
      const payment1 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 30000,
        txClient: mockTxClient,
      });

      expect(payment1.periodStart.toISOString().split('T')[0]).toBe('2026-03-15');
      expect(payment1.periodEnd.toISOString().split('T')[0]).toBe('2027-03-14');
      expect(payment1.isFullySettled).toBe(false);
      expect(payment1.isAdvancing).toBe(false);
      expect(propertyInDb.amountPaid).toBe(30000);
      expect(propertyInDb.amountRemaining).toBe(70000);
      expect(propertyInDb.isFirstRent).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString().split('T')[0]).toBe('2026-03-15');

      // Step 2: Tenant completes remaining 70,000 for the first cycle
      const payment2 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 70000,
        txClient: mockTxClient,
      });

      expect(payment2.periodStart.toISOString().split('T')[0]).toBe('2026-03-15');
      expect(payment2.periodEnd.toISOString().split('T')[0]).toBe('2027-03-14');
      expect(payment2.isFullySettled).toBe(true);
      expect(payment2.isAdvancing).toBe(false);
      expect(propertyInDb.amountPaid).toBe(100000);
      expect(propertyInDb.amountRemaining).toBe(0);
      expect(propertyInDb.isFirstRent).toBe(false);
      expect(propertyInDb.rentStartDate.toISOString().split('T')[0]).toBe('2026-03-15');

      // Step 3: Next cycle renewal payment of 100,000
      const payment3 = await service.processRentPayment({
        userId: 1,
        propertyId: 1,
        rentPortion: 100000,
        txClient: mockTxClient,
      });

      // Receipt period MUST advance to 2027-03-15 to 2028-03-14
      expect(payment3.periodStart.toISOString().split('T')[0]).toBe('2027-03-15');
      expect(payment3.periodEnd.toISOString().split('T')[0]).toBe('2028-03-14');
      expect(payment3.isFullySettled).toBe(true);
      expect(payment3.isAdvancing).toBe(true);
      expect(propertyInDb.amountPaid).toBe(100000);
      expect(propertyInDb.amountRemaining).toBe(0);
      expect(propertyInDb.isFirstRent).toBe(false);
      expect(propertyInDb.rentStartDate.toISOString().split('T')[0]).toBe('2027-03-15');
    });

    it('Scenario 2: Pre-paid onboarding (tenantnoinspection scenario) must not skip 2027-2028', async () => {
      // 2026-2027 was pre-paid, so active period is 2026-2027 with amountRemaining=0, isFirstRent=false
      let propertyInDb: any = {
        id: 2,
        rentAmount: 200,
        rentStartDate: new Date('2026-03-15T00:00:00.000Z'),
        rentEndDate: new Date('2027-03-14T23:59:59.999Z'),
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

      // First live payment of 200: must advance from 2026-2027 to 2027-2028
      const payment1 = await service.processRentPayment({
        userId: 2,
        propertyId: 2,
        rentPortion: 200,
        txClient: mockTxClient,
      });

      expect(payment1.periodStart.toISOString().split('T')[0]).toBe('2027-03-15');
      expect(payment1.periodEnd.toISOString().split('T')[0]).toBe('2028-03-14');
      expect(payment1.isFullySettled).toBe(true);
      expect(payment1.isAdvancing).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString().split('T')[0]).toBe('2027-03-15');

      // Second live payment of 200: must advance from 2027-2028 to 2028-2029
      const payment2 = await service.processRentPayment({
        userId: 2,
        propertyId: 2,
        rentPortion: 200,
        txClient: mockTxClient,
      });

      expect(payment2.periodStart.toISOString().split('T')[0]).toBe('2028-03-15');
      expect(payment2.periodEnd.toISOString().split('T')[0]).toBe('2029-03-14');
      expect(payment2.isFullySettled).toBe(true);
      expect(payment2.isAdvancing).toBe(true);
      expect(propertyInDb.rentStartDate.toISOString().split('T')[0]).toBe('2028-03-15');
    });
  });
});
