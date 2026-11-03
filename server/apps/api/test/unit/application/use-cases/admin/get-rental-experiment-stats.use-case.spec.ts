import { GetRentalExperimentStatsUseCase } from '../../../../../src/application/use-cases/admin/get-rental-experiment-stats.use-case'

describe('GetRentalExperimentStatsUseCase', () => {
  let useCase: GetRentalExperimentStatsUseCase
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      upward_user_session_event: {
        findMany: jest.fn(),
      },
    }
    useCase = new GetRentalExperimentStatsUseCase(mockPrisma)
  })

  it('should aggregate metrics accurately across required, deferrable, and fallback variants', async () => {
    const baseDate = new Date('2025-06-01T10:00:00.000Z')
    const t = (minutes: number) => new Date(baseDate.getTime() + minutes * 60 * 1000)

    const mockEvents = [
      // User 1: Required variant -> Assigned -> Exposed -> Viewed -> Started -> Completed -> Activated (day 2)
      {
        id: 1,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'EXPERIMENT_ASSIGNED',
        screenName: null,
        metadata: { variant: 'required-rental', isFallback: false, userUuid: 'uuid-1' },
        createdAt: t(0),
        session: { userEmail: 'user1@example.com' },
      },
      {
        id: 2,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'EXPERIMENT_EXPOSURE',
        screenName: 'ProfileSetupBlocker',
        metadata: { variant: 'required-rental', isFallback: false, userUuid: 'uuid-1' },
        createdAt: t(1),
        session: { userEmail: 'user1@example.com' },
      },
      {
        id: 3,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'RENTAL_DETAILS_VIEWED',
        screenName: 'RentalFormView',
        metadata: { variant: 'required-rental', userUuid: 'uuid-1' },
        createdAt: t(2),
        session: { userEmail: 'user1@example.com' },
      },
      {
        id: 4,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'RENTAL_DETAILS_STARTED',
        screenName: 'RentalFormView',
        metadata: { variant: 'required-rental', userUuid: 'uuid-1' },
        createdAt: t(3),
        session: { userEmail: 'user1@example.com' },
      },
      {
        id: 5,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'RENTAL_DETAILS_COMPLETED',
        screenName: 'RentalConfirmView',
        metadata: { variant: 'required-rental', userUuid: 'uuid-1' },
        createdAt: t(10), // completed in 10 minutes
        session: { userEmail: 'user1@example.com' },
      },
      {
        id: 6,
        sessionId: 'sess_1',
        userId: 101,
        eventName: 'PAYMENT_SUCCESS',
        screenName: 'PaymentModal',
        metadata: { amount: 200000 },
        createdAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000), // Day 2 (within 7d)
        session: { userEmail: 'user1@example.com' },
      },

      // User 2: Deferrable variant -> Assigned -> Exposed -> Deferred -> Later Returned & Completed (Recovery)
      {
        id: 7,
        sessionId: 'sess_2',
        userId: 102,
        eventName: 'EXPERIMENT_ASSIGNED',
        screenName: null,
        metadata: { variant: 'deferrable-rental', isFallback: false, userUuid: 'uuid-2' },
        createdAt: t(0),
        session: { userEmail: 'user2@example.com' },
      },
      {
        id: 8,
        sessionId: 'sess_2',
        userId: 102,
        eventName: 'EXPERIMENT_EXPOSURE',
        screenName: 'ProfileSetupBlocker',
        metadata: { variant: 'deferrable-rental', isFallback: false, userUuid: 'uuid-2' },
        createdAt: t(1),
        session: { userEmail: 'user2@example.com' },
      },
      {
        id: 9,
        sessionId: 'sess_2',
        userId: 102,
        eventName: 'RENTAL_DETAILS_DEFERRED',
        screenName: 'ProfileSetupBlocker',
        metadata: { variant: 'deferrable-rental', source: 'profile_blocker_footer', userUuid: 'uuid-2' },
        createdAt: t(2),
        session: { userEmail: 'user2@example.com' },
      },
      {
        id: 10,
        sessionId: 'sess_2_subsequent',
        userId: 102,
        eventName: 'RENTAL_DETAILS_COMPLETED',
        screenName: 'RentalConfirmView',
        metadata: { variant: 'deferrable-rental', userUuid: 'uuid-2' },
        createdAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // Day 1
        session: { userEmail: 'user2@example.com' },
      },

      // User 3: Fallback user (network error / unconfirmed LD evaluation) -> safe deferrable experience
      {
        id: 11,
        sessionId: 'sess_3',
        userId: 103,
        eventName: 'EXPERIMENT_ASSIGNED',
        screenName: null,
        metadata: { variant: 'deferrable-rental', isFallback: true, userUuid: 'uuid-3' },
        createdAt: t(0),
        session: { userEmail: 'user3@example.com' },
      },
      {
        id: 12,
        sessionId: 'sess_3',
        userId: 103,
        eventName: 'EXPERIMENT_EXPOSURE',
        screenName: 'ProfileSetupBlocker',
        metadata: { variant: 'deferrable-rental', isFallback: true, userUuid: 'uuid-3' },
        createdAt: t(1),
        session: { userEmail: 'user3@example.com' },
      },
    ]

    mockPrisma.upward_user_session_event.findMany.mockResolvedValue(mockEvents)

    const result = await useCase.execute({
      startDate: new Date('2025-05-01').toISOString(),
      endDate: new Date('2025-07-01').toISOString(),
    })

    expect(result).toBeDefined()
    expect(result.experimentKey).toBe('onboarding-rental-experience')

    // Randomized participant summary: 1 required + 1 deferrable = 2
    expect(result.summary.totalAssigned).toBe(2)
    expect(result.summary.totalExposed).toBe(2)
    expect(result.summary.totalCompleted).toBe(2)
    expect(result.summary.fallbackCount).toBe(1) // Fallback counted separately!

    // Variant A (Required)
    const req = result.variants.required
    expect(req.assignedCount).toBe(1)
    expect(req.exposedCount).toBe(1)
    expect(req.completedCount).toBe(1)
    expect(req.completionRate).toBe(100)
    expect(req.activated7dCount).toBe(1)
    expect(req.activation7dRate).toBe(100)
    expect(req.deferredCount).toBe(0)
    expect(req.avgTimeToCompleteMinutes).toBe(10)

    // Variant B (Deferrable)
    const def = result.variants.deferrable
    expect(def.assignedCount).toBe(1)
    expect(def.exposedCount).toBe(1)
    expect(def.deferredCount).toBe(1)
    expect(def.deferralRate).toBe(100)
    expect(def.completedCount).toBe(1)
    expect(def.recoveredCount).toBe(1) // recovered after deferral
    expect(def.recoveryRate).toBe(100)

    // Fallback cohort
    const fb = result.variants.fallback
    expect(fb.assignedCount).toBe(1)
    expect(fb.exposedCount).toBe(1)

    // Funnel stages
    expect(result.funnel.length).toBe(6)
    expect(result.funnel[0]!.name).toBe('Assigned')
    expect(result.funnel[5]!.name).toBe('7-Day Core Activation')

    // Participants list
    expect(result.participants.length).toBe(3)
    const user1Participant = result.participants.find((p) => p.userKey === 'uuid-1')
    expect(user1Participant?.status).toBe('COMPLETED')
    expect(user1Participant?.isFallback).toBe(false)
  })

  it('should exclude actions occurring after the 7-day outcome window from 7d activation rate', async () => {
    const baseDate = new Date('2025-06-01T10:00:00.000Z')

    const mockEvents = [
      {
        id: 1,
        sessionId: 'sess_late',
        userId: 201,
        eventName: 'EXPERIMENT_ASSIGNED',
        screenName: null,
        metadata: { variant: 'required-rental', isFallback: false, userUuid: 'uuid-late' },
        createdAt: baseDate,
        session: { userEmail: 'late@example.com' },
      },
      {
        id: 2,
        sessionId: 'sess_late',
        userId: 201,
        eventName: 'PAYMENT_SUCCESS',
        screenName: 'PaymentModal',
        metadata: { amount: 100000 },
        createdAt: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000), // Day 10 (outside 7d window)
        session: { userEmail: 'late@example.com' },
      },
    ]

    mockPrisma.upward_user_session_event.findMany.mockResolvedValue(mockEvents)

    const result = await useCase.execute({})
    expect(result.variants.required.activated7dCount).toBe(0)
    expect(result.variants.required.activation7dRate).toBe(0)
  })
})
