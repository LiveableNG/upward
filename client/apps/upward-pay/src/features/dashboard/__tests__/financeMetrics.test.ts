import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

interface PendingItem {
  uuid?: string
  type?: string
  userPropertyUuid?: string
  amount?: number
}

interface UserProperty {
  uuid: string
  isPastTenancy?: boolean
}

function filterActivePendingInvoices(
  rawPending: PendingItem[] | null | undefined,
  properties: UserProperty[] | null | undefined,
): PendingItem[] {
  return (rawPending || []).filter((p) => {
    if (p.type === 'refund_alert') return false
    if (!p.userPropertyUuid) return true
    const prop = properties?.find((pr) => pr.uuid === p.userPropertyUuid)
    return !prop?.isPastTenancy
  })
}

interface ScoreData {
  isScorable?: boolean
  score?: number
  maxScore?: number
  band?: string
}

function resolveRentScoreDisplay(
  isLoading: boolean,
  isError: boolean,
  data: ScoreData | null | undefined,
) {
  if (isLoading) return { status: 'loading' }
  if (isError || !data) return { status: 'unavailable', display: '—' }
  if (!data.isScorable || typeof data.score !== 'number' || data.score <= 0) {
    return { status: 'unranked', display: 'Unranked', hint: 'Pay rent to activate' }
  }
  return {
    status: 'scored',
    score: data.score,
    maxScore: data.maxScore && data.maxScore > 0 ? data.maxScore : null,
    band: data.band ? data.band.toUpperCase() : null,
  }
}

describe('Finance Page Metrics Sourcing & Filtering Logic', () => {
  describe('filterActivePendingInvoices', () => {
    it('filters out refund alerts', () => {
      const items: PendingItem[] = [
        { uuid: '1', type: 'rent_invoice', amount: 50000 },
        { uuid: '2', type: 'refund_alert', amount: 10000 },
      ]
      const result = filterActivePendingInvoices(items, [])
      assert.equal(result.length, 1)
      assert.equal(result[0].uuid, '1')
    })

    it('filters out invoices attached to past tenancies', () => {
      const properties: UserProperty[] = [
        { uuid: 'prop-active', isPastTenancy: false },
        { uuid: 'prop-old', isPastTenancy: true },
      ]
      const items: PendingItem[] = [
        { uuid: 'inv-1', userPropertyUuid: 'prop-active' },
        { uuid: 'inv-2', userPropertyUuid: 'prop-old' },
        { uuid: 'inv-3' }, // unattached invoice still counts
      ]
      const result = filterActivePendingInvoices(items, properties)
      assert.equal(result.length, 2)
      assert.deepEqual(result.map((r) => r.uuid), ['inv-1', 'inv-3'])
    })

    it('handles empty or null inputs gracefully', () => {
      assert.deepEqual(filterActivePendingInvoices(null, null), [])
      assert.deepEqual(filterActivePendingInvoices(undefined, undefined), [])
      assert.deepEqual(filterActivePendingInvoices([], []), [])
    })
  })

  describe('resolveRentScoreDisplay', () => {
    it('returns loading state when query is loading', () => {
      const res = resolveRentScoreDisplay(true, false, null)
      assert.equal(res.status, 'loading')
    })

    it('returns unavailable when query errors or data is missing', () => {
      const res = resolveRentScoreDisplay(false, true, null)
      assert.equal(res.status, 'unavailable')
      assert.equal(res.display, '—')
    })

    it('returns unranked without fabricated score when user is not scorable', () => {
      const res = resolveRentScoreDisplay(false, false, {
        isScorable: false,
        score: 0,
        maxScore: 850,
      })
      assert.equal(res.status, 'unranked')
      assert.equal(res.display, 'Unranked')
      assert.equal(res.hint, 'Pay rent to activate')
    })

    it('returns genuine score and band when user has a verified score', () => {
      const res = resolveRentScoreDisplay(false, false, {
        isScorable: true,
        score: 740,
        maxScore: 850,
        band: 'Excellent',
      })
      assert.equal(res.status, 'scored')
      assert.equal(res.score, 740)
      assert.equal(res.maxScore, 850)
      assert.equal(res.band, 'EXCELLENT')
    })
  })
})
