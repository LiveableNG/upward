import { IngestPastRecordsUseCase } from '@application/use-cases/user/ingest-past-records.use-case'
import { FulfillCredibilityRequestUseCase } from '@application/use-cases/external/fulfill-credibility-request.use-case'
import { RentalPeriodService } from '@application/services/rental-period.service'

describe('IngestPastRecordsUseCase & FulfillCredibilityRequestUseCase (V2 Trust Tiers)', () => {
  let ingestUseCase: IngestPastRecordsUseCase
  let fulfillUseCase: FulfillCredibilityRequestUseCase
  let prisma: any
  let rentCycleRepo: any
  let rentalPeriodService: RentalPeriodService
  let sendNotification: any

  beforeEach(() => {
    prisma = {
      upward_user: { findUnique: jest.fn() },
      upward_user_property: { update: jest.fn(), findUnique: jest.fn() },
      upward_rent_cycle: { updateMany: jest.fn() },
      upward_credibility_request: { findUnique: jest.fn(), update: jest.fn() },
    }
    rentCycleRepo = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 1, uuid: 'rc-1', ...data })),
    }
    rentalPeriodService = new RentalPeriodService()
    sendNotification = { execute: jest.fn().mockResolvedValue(true) }

    ingestUseCase = new IngestPastRecordsUseCase(prisma, rentCycleRepo, rentalPeriodService)
    fulfillUseCase = new FulfillCredibilityRequestUseCase(prisma, ingestUseCase, sendNotification)
  })

  it('stores tenant self-reported past records on an unverified property as SELF_REPORTED without marking the property verified', async () => {
    prisma.upward_user.findUnique.mockResolvedValueOnce({
      id: 10,
      uuid: 'tenant-uuid',
      properties: [
        {
          id: 50,
          uuid: 'prop-unverified',
          rentAmount: 1500000,
          rentType: 'Annually',
          isVerified: false,
        },
      ],
    })

    const res = await ingestUseCase.execute('tenant-uuid', {
      propertyUuid: 'prop-unverified',
      records: [
        {
          amount: 1500000,
          dueDate: '2025-11-01',
          paidDate: '2025-10-20',
        },
      ],
    })

    expect(res.success).toBe(true)
    expect(res.verified).toBe(false)
    expect(rentCycleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        userPropertyId: 50,
        source: 'SELF_REPORTED',
        status: 'PAID_ON_TIME',
      }),
    )
    expect(prisma.upward_user_property.update).not.toHaveBeenCalled()
  })

  it('stores PM-fulfilled credibility records as verified PAST_RECORD, marks property verified, and upgrades existing SELF_REPORTED records', async () => {
    prisma.upward_credibility_request.findUnique.mockResolvedValueOnce({
      id: 1,
      uuid: 'cred-req-1',
      status: 'PENDING',
      propertyUuid: 'prop-unverified',
      user: { id: 10, uuid: 'tenant-uuid' },
    })
    prisma.upward_user.findUnique.mockResolvedValueOnce({
      id: 10,
      uuid: 'tenant-uuid',
      properties: [
        {
          id: 50,
          uuid: 'prop-unverified',
          rentAmount: 1500000,
          rentType: 'Annually',
          isVerified: false,
        },
      ],
    })
    prisma.upward_credibility_request.update.mockResolvedValueOnce({
      id: 1,
      uuid: 'cred-req-1',
      status: 'COMPLETED',
    })
    prisma.upward_user_property.findUnique.mockResolvedValueOnce({
      id: 50,
      uuid: 'prop-unverified',
      location: { address: '12 Admiralty Way' },
    })

    const res = await fulfillUseCase.execute('cred-req-1', {
      records: [
        {
          amount: 1500000,
          dueDate: '2025-11-01',
          paidDate: '2025-11-02', // 1 day after due date -> within 48h grace window -> PAID_ON_TIME
        },
      ],
    })

    expect(res.success).toBe(true)
    expect(rentCycleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        userPropertyId: 50,
        source: 'PAST_RECORD',
        status: 'PAID_ON_TIME',
      }),
    )
    expect(prisma.upward_user_property.update).toHaveBeenCalledWith({
      where: { id: 50 },
      data: { isVerified: true, verificationStatus: 'VERIFIED' },
    })
    expect(prisma.upward_rent_cycle.updateMany).toHaveBeenCalledWith({
      where: { userId: 10, userPropertyId: 50, source: 'SELF_REPORTED' },
      data: { source: 'PAST_RECORD' },
    })
  })
})
