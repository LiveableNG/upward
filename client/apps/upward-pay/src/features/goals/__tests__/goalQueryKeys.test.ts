import test from 'node:test'
import assert from 'node:assert/strict'
import { goalQueryKeys } from '../utils/goalQueryKeys'

test('Goal Query Keys — structure and determinism', async (t) => {
  await t.test('categories key is static', () => {
    assert.deepStrictEqual(goalQueryKeys.categories(), ['goal-categories'])
  })

  await t.test('publicList key incorporates query parameters', () => {
    const key = goalQueryKeys.publicList({ categoryId: 3, status: 'PUBLISHED' })
    assert.deepStrictEqual(key, ['goals-list', { categoryId: 3, status: 'PUBLISHED' }])
  })

  await t.test('publicDetail key accepts identifier', () => {
    assert.deepStrictEqual(goalQueryKeys.publicDetail('career-step'), [
      'goal-detail',
      'career-step',
    ])
    assert.deepStrictEqual(goalQueryKeys.publicDetail(42), ['goal-detail', 42])
  })

  await t.test('userGoals key scopes to user identifier', () => {
    const key = goalQueryKeys.userGoals('usr-123', { status: 'ACTIVE' })
    assert.deepStrictEqual(key, ['user-goals', 'usr-123', { status: 'ACTIVE' }])
  })

  await t.test('userGoalDetail key scopes to user and goal identifier', () => {
    const key = goalQueryKeys.userGoalDetail('usr-123', 'ug-999')
    assert.deepStrictEqual(key, ['user-goal-detail', 'usr-123', 'ug-999'])
  })

  await t.test('milestones key scopes to user and goal identifier', () => {
    const key = goalQueryKeys.milestones('usr-123', 'ug-999')
    assert.deepStrictEqual(key, ['goal-milestones', 'usr-123', 'ug-999'])
  })
})
