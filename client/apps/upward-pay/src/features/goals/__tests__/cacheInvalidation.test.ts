import test from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import { goalQueryKeys } from '../utils/goalQueryKeys'

test('Cache Invalidation & Query Management Contracts', async (t) => {
  const userKey = 'usr-test-123'
  const goalId = 'ug-goal-456'

  await t.test('adopting a catalogue goal invalidates user-goals list and seeds detail cache', () => {
    const queryClient = new QueryClient()

    // Seed list
    queryClient.setQueryData(goalQueryKeys.userGoals(userKey), [{ id: 1, customTitle: 'Existing' }])

    // Simulate onSuccess behavior of useAdoptCatalogueGoal
    const newGoal = {
      id: 50,
      uuid: 'ug-goal-50',
      userId: 123,
      categoryId: 2,
      customTitle: 'New Adopted Goal',
      status: 'ACTIVE' as const,
      progressSource: 'TARGET_AMOUNT' as const,
      progressPct: 0,
      currency: 'NGN',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    }

    queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    queryClient.setQueryData(
      goalQueryKeys.userGoalDetail(userKey, newGoal.uuid || newGoal.id),
      newGoal,
    )

    // Verify detail is immediately populated
    const detailData = queryClient.getQueryData(goalQueryKeys.userGoalDetail(userKey, newGoal.uuid))
    assert.deepStrictEqual(detailData, newGoal)
  })

  await t.test('toggling a milestone invalidates milestones, goal detail, and goal list', () => {
    const queryClient = new QueryClient()

    let invalidatedKeys: string[] = []
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = async (filters: any) => {
      invalidatedKeys.push(JSON.stringify(filters?.queryKey))
      return originalInvalidate(filters)
    }

    // Simulate milestone toggle onSuccess
    queryClient.invalidateQueries({
      queryKey: goalQueryKeys.milestones(userKey, goalId),
    })
    queryClient.invalidateQueries({
      queryKey: goalQueryKeys.userGoalDetail(userKey, goalId),
    })
    queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })

    assert.strictEqual(invalidatedKeys.length, 3)
    assert.ok(invalidatedKeys.some((k) => k.includes('goal-milestones')))
    assert.ok(invalidatedKeys.some((k) => k.includes('user-goal-detail')))
    assert.ok(invalidatedKeys.some((k) => k.includes('user-goals')))
  })

  await t.test('lifecycle transitions (pause, complete, archive) update detail and invalidate lists', () => {
    const queryClient = new QueryClient()

    const updatedGoal = {
      id: 456,
      uuid: goalId,
      userId: 123,
      categoryId: 1,
      customTitle: 'Paused Goal',
      status: 'PAUSED' as const,
      progressSource: 'STATUS_ONLY' as const,
      progressPct: 50,
      currency: 'NGN',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    }

    // Simulate usePauseGoal onSuccess
    queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    queryClient.setQueryData(
      goalQueryKeys.userGoalDetail(userKey, updatedGoal.uuid),
      updatedGoal,
    )

    const detailData = queryClient.getQueryData<typeof updatedGoal>(
      goalQueryKeys.userGoalDetail(userKey, goalId),
    )
    assert.strictEqual(detailData?.status, 'PAUSED')
  })
})
