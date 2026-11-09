import { IngestExternalRentHistoryUseCase } from '@application/use-cases/external/ingest-external-rent-history.use-case'
import { RentalPeriodService } from '@application/services/rental-period.service'

describe('IngestExternalRentHistoryUseCase (GoodTenants Verified History)', () => {
  let useCase: IngestExternalRentHistoryUseCase
  let prisma: any
  let rentCycleRepo: any
  let rentalPeriodService: RentalPeriodService

  beforeEach(() => {
    prisma = {
      upward_user_property: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      upward_platform_rent_payment: {
        create: jest.fn(),
      },
    }
    rentCycleRepo = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 1, uuid: 'rc-gt', ...data })),
    }
    rentalPeriodService = new RentalPeriodService()
    jest.spyOn(rentalPeriodService, 'syncPlatformPropertyState').mockResolvedValue(undefined)

    useCase = new IngestExternalRentHistoryUseCase(prisma, rentCycleRepo, rentalPeriodService)
  })

  it('ingests 3 years of GoodTenants verified rent history as GOODTENANTS_HISTORY preserving exact dueDate and paidAt timestamps', async () => {
    prisma.upward_user_property.findFirst.mockResolvedValueOnce({
      id: 77,
      uuid: 'prop-gt-77',
      userId: 12,
      rentAmount: 2000000,
      rentType: 'Annually',
      currency: 'NGN',
      platformId: 1,
      user: { uuid: 'funke-uuid' },
    })

    const res = await useCase.execute(
      'prop-gt-77',
      [
        {
          amount: 2000000,
          dueDate: '2023-11-01',
          paymentDate: '2023-10-20', // 12 days early
        },
        {
          amount: 2000000,
          dueDate: '2024-11-01',
          paymentDate: '2024-11-01', // on due date
        },
        {
          amount: 2000000,
          dueDate: '2025-11-01',
          paymentDate: '2025-11-02', // 1 day after due date (within 48h grace)
        },
      ],
      1,
    )

    expect(res.success).toBe(true)
    expect(res.recordsIngested).toBe(3)
    expect(rentCycleRepo.create).toHaveBeenCalledTimes(3)

    // Verify all 3 cycles are tagged GOODTENANTS_HISTORY and PAID_ON_TIME with exact dates preserved
    expect(rentCycleRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        source: 'GOODTENANTS_HISTORY',
        status: 'PAID_ON_TIME',
        dueDate: new Date('2023-11-01T00:00:00.000Z'),
        paidAt: new Date('2023-10-20T00:00:00.000Z'),
      }),
    )
    expect(rentCycleRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        source: 'GOODTENANTS_HISTORY',
        status: 'PAID_ON_TIME',
        dueDate: new Date('2024-11-01T00:00:00.000Z'),
        paidAt: new Date('2024-11-01T00:00:00.000Z'),
      }),
    )
    expect(rentCycleRepo.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        source: 'GOODTENANTS_HISTORY',
        status: 'PAID_ON_TIME',
        dueDate: new Date('2025-11-01T00:00:00.000Z'),
        paidAt: new Date('2025-11-02T00:00:00.000Z'),
      }),
    )
    expect(prisma.upward_user_property.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: { isVerified: true },
    })
  })
})
