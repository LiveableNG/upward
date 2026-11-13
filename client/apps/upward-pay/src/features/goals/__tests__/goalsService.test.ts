import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1'

import {
  fetchGoalCategories,
  fetchGoalsList,
  fetchGoalDetail,
  fetchUserGoals,
  fetchUserGoalDetail,
  adoptCatalogueGoal,
  createCustomGoal,
  setUserGoals,
  updateUserGoal,
  activateGoal,
  pauseGoal,
  completeGoal,
  archiveGoal,
  removeUserGoal,
  fetchGoalMilestones,
  createGoalMilestone,
  updateGoalMilestone,
  toggleGoalMilestoneStatus,
  deleteGoalMilestone,
} from '../services/goalsService'

interface CapturedCall {
  url: string
  method: string
  body?: any
}

let capturedCalls: CapturedCall[] = []
let mockResponseData: any = { data: {} }

const originalFetch = globalThis.fetch

function setupFetchMock() {
  capturedCalls = []
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString()
    const method = init?.method || 'GET'
    let parsedBody = undefined
    if (init?.body && typeof init.body === 'string') {
      try {
        parsedBody = JSON.parse(init.body)
      } catch {
        parsedBody = init.body
      }
    }

    capturedCalls.push({ url: urlStr, method, body: parsedBody })

    const responsePayload = JSON.stringify(mockResponseData)
    return new Response(responsePayload, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

test('goalsService — Endpoint construction and request contracts', async (t) => {
  t.beforeEach(() => {
    setupFetchMock()
  })

  t.afterEach(() => {
    restoreFetch()
  })

  await t.test('fetchGoalCategories hits GET /public/goals/categories', async () => {
    mockResponseData = { data: [{ id: 1, title: 'Housing' }] }
    const result = await fetchGoalCategories()

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/public/goals/categories'))
    assert.strictEqual(capturedCalls[0].method, 'GET')
    assert.strictEqual(result.length, 1)
  })

  await t.test('fetchGoalsList serializes query parameters correctly', async () => {
    mockResponseData = { data: [], meta: { total: 0, skip: 0, take: 10 } }
    await fetchGoalsList({ categoryId: 4, status: 'PUBLISHED', skip: 10, take: 20 })

    assert.strictEqual(capturedCalls.length, 1)
    const url = capturedCalls[0].url
    assert.ok(url.includes('/public/goals/list?'))
    assert.ok(url.includes('categoryId=4'))
    assert.ok(url.includes('status=PUBLISHED'))
    assert.ok(url.includes('skip=10'))
    assert.ok(url.includes('take=20'))
    assert.strictEqual(capturedCalls[0].method, 'GET')
  })

  await t.test('fetchUserGoals supports filters and pagination', async () => {
    mockResponseData = { data: [{ id: 10, status: 'ACTIVE' }] }
    await fetchUserGoals({ status: 'ACTIVE', categoryId: 2, includeArchived: true })

    assert.strictEqual(capturedCalls.length, 1)
    const url = capturedCalls[0].url
    assert.ok(url.includes('/user/goals?'))
    assert.ok(url.includes('status=ACTIVE'))
    assert.ok(url.includes('categoryId=2'))
    assert.ok(url.includes('includeArchived=true'))
    assert.strictEqual(capturedCalls[0].method, 'GET')
  })

  await t.test('fetchUserGoalDetail calls /user/goals/:id', async () => {
    mockResponseData = { data: { id: 123, uuid: 'ug-123', customTitle: 'My Goal' } }
    const res = await fetchUserGoalDetail('ug-123')

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/ug-123'))
    assert.strictEqual(capturedCalls[0].method, 'GET')
    assert.strictEqual(res.customTitle, 'My Goal')
  })

  await t.test('adoptCatalogueGoal sends POST to /user/goals/adopt with exact DTO', async () => {
    mockResponseData = { data: { id: 50, goalId: 10 } }
    const dto = {
      goalId: 10,
      targetDate: '2027-01-01T00:00:00Z',
      notes: 'Adopting goal',
      targetAmountMinor: '5000000',
      currency: 'NGN',
      progressSource: 'TARGET_AMOUNT' as const,
    }

    await adoptCatalogueGoal(dto)

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/adopt'))
    assert.strictEqual(capturedCalls[0].method, 'POST')
    assert.deepStrictEqual(capturedCalls[0].body, dto)
  })

  await t.test('createCustomGoal sends POST to /user/goals/custom with exact DTO', async () => {
    mockResponseData = { data: { id: 51, customTitle: 'Custom Tech Trip' } }
    const dto = {
      customTitle: 'Custom Tech Trip',
      categoryId: 3,
      customDescription: 'Trip to Silicon Valley',
      targetDate: '2027-06-01T00:00:00Z',
      targetAmountMinor: '12000000',
      currency: 'USD',
      progressSource: 'MILESTONES' as const,
    }

    await createCustomGoal(dto)

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/custom'))
    assert.strictEqual(capturedCalls[0].method, 'POST')
    assert.deepStrictEqual(capturedCalls[0].body, dto)
  })

  await t.test('setUserGoals preserves legacy batch endpoint /user/goals/set', async () => {
    mockResponseData = { data: [{ id: 1 }, { id: 2 }] }
    await setUserGoals({ goalIds: [1, 2] })

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/set'))
    assert.strictEqual(capturedCalls[0].method, 'POST')
    assert.deepStrictEqual(capturedCalls[0].body, { goalIds: [1, 2] })
  })

  await t.test('updateUserGoal sends PATCH to /user/goals/:id', async () => {
    mockResponseData = { data: { id: 10, progressPct: 80 } }
    await updateUserGoal(10, { progressPct: 80, notes: 'Progress updated' })

    assert.strictEqual(capturedCalls.length, 1)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/10'))
    assert.strictEqual(capturedCalls[0].method, 'PATCH')
    assert.deepStrictEqual(capturedCalls[0].body, { progressPct: 80, notes: 'Progress updated' })
  })

  await t.test('lifecycle endpoints: activate, pause, complete, archive, delete', async () => {
    // activate
    mockResponseData = { data: { id: 99, status: 'ACTIVE' } }
    await activateGoal(99)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/99/activate'))
    assert.strictEqual(capturedCalls[0].method, 'POST')

    // pause
    mockResponseData = { data: { id: 99, status: 'PAUSED' } }
    await pauseGoal(99)
    assert.ok(capturedCalls[1].url.endsWith('/user/goals/99/pause'))
    assert.strictEqual(capturedCalls[1].method, 'POST')

    // complete
    mockResponseData = { data: { id: 99, status: 'COMPLETED' } }
    await completeGoal(99)
    assert.ok(capturedCalls[2].url.endsWith('/user/goals/99/complete'))
    assert.strictEqual(capturedCalls[2].method, 'POST')

    // archive
    mockResponseData = { data: { id: 99, status: 'ARCHIVED' } }
    await archiveGoal(99)
    assert.ok(capturedCalls[3].url.endsWith('/user/goals/99/archive'))
    assert.strictEqual(capturedCalls[3].method, 'POST')

    // remove
    mockResponseData = { success: true, message: 'Goal removed' }
    await removeUserGoal(99)
    assert.ok(capturedCalls[4].url.endsWith('/user/goals/99'))
    assert.strictEqual(capturedCalls[4].method, 'DELETE')
  })

  await t.test('milestone endpoints: list, create, update, toggle, delete', async () => {
    // list
    mockResponseData = { data: [{ id: 1, title: 'Step 1' }] }
    await fetchGoalMilestones(44)
    assert.ok(capturedCalls[0].url.endsWith('/user/goals/44/milestones'))
    assert.strictEqual(capturedCalls[0].method, 'GET')

    // create
    mockResponseData = { data: { id: 2, title: 'Step 2' } }
    await createGoalMilestone(44, { title: 'Step 2', targetDate: '2026-12-01' })
    assert.ok(capturedCalls[1].url.endsWith('/user/goals/44/milestones'))
    assert.strictEqual(capturedCalls[1].method, 'POST')
    assert.deepStrictEqual(capturedCalls[1].body, { title: 'Step 2', targetDate: '2026-12-01' })

    // update
    mockResponseData = { data: { id: 2, title: 'Step 2 Updated' } }
    await updateGoalMilestone(44, 2, { title: 'Step 2 Updated' })
    assert.ok(capturedCalls[2].url.endsWith('/user/goals/44/milestones/2'))
    assert.strictEqual(capturedCalls[2].method, 'PATCH')
    assert.deepStrictEqual(capturedCalls[2].body, { title: 'Step 2 Updated' })

    // toggle
    mockResponseData = { data: { id: 2, status: 'COMPLETED' } }
    await toggleGoalMilestoneStatus(44, 2)
    assert.ok(capturedCalls[3].url.endsWith('/user/goals/44/milestones/2/toggle'))
    assert.strictEqual(capturedCalls[3].method, 'POST')

    // delete
    mockResponseData = { success: true, message: 'Deleted' }
    await deleteGoalMilestone(44, 2)
    assert.ok(capturedCalls[4].url.endsWith('/user/goals/44/milestones/2'))
    assert.strictEqual(capturedCalls[4].method, 'DELETE')
  })
})
