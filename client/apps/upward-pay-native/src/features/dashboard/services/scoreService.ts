import { useQuery } from '@tanstack/react-query'

import {
  type ScorePaymentCycle,
  type ScoreProfileData,
  type ScoreProperty,
} from '@/features/dashboard/types'
import { request } from '@/lib/api-client'

const EMPTY_SCORE: ScoreProfileData = {
  isScorable: false,
  score: 0,
  maxScore: 1000,
  band: 'STARTER',
  rank: 'N/A',
  metrics: { ptPercentage: 0, longestStreak: 0 },
  profile: { profileCompletion: 0 },
  cycles: [],
  properties: [],
}

function normalizeCycles(raw: unknown): ScorePaymentCycle[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const c = item as Record<string, unknown>
    return {
      id: c.id != null ? Number(c.id) : undefined,
      uuid: c.uuid != null ? String(c.uuid) : undefined,
      amount: Number(c.amount ?? 0),
      dueDate: String(c.dueDate ?? c.due_date ?? ''),
      paidDate: c.paidDate != null ? String(c.paidDate) : null,
      status: String(c.status ?? 'PENDING'),
      ptValue: c.ptValue != null ? Number(c.ptValue) : undefined,
      source: String(c.source ?? 'UPWARD'),
      excluded: Boolean(c.excluded),
      propertyLabel: c.propertyLabel != null ? String(c.propertyLabel) : undefined,
    }
  })
}

function normalizeProperties(raw: unknown): ScoreProperty[] {
  if (!Array.isArray(raw)) return []
  return raw as ScoreProperty[]
}

function normalizeScoreProfile(raw: unknown): ScoreProfileData {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_SCORE
  }

  const envelope = raw as Record<string, unknown>
  const data = (envelope.data as Record<string, unknown> | undefined) ?? envelope
  const metricsRaw = (data.metrics as Record<string, unknown> | undefined) ?? {}
  const profileRaw = (data.profile as Record<string, unknown> | undefined) ?? {}

  return {
    isScorable: Boolean(data.isScorable),
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 1000),
    band: String(data.band ?? 'STARTER'),
    rank: String(data.rank ?? 'N/A'),
    metrics: {
      ptPercentage: Number(metricsRaw.ptPercentage ?? 0),
      longestStreak: Number(metricsRaw.longestStreak ?? 0),
      totalCycles: metricsRaw.totalCycles != null ? Number(metricsRaw.totalCycles) : undefined,
      historyYears: metricsRaw.historyYears != null ? Number(metricsRaw.historyYears) : undefined,
      discipline: metricsRaw.discipline != null ? Number(metricsRaw.discipline) : undefined,
      savingsBonus: metricsRaw.savingsBonus != null ? Number(metricsRaw.savingsBonus) : undefined,
    },
    profile: {
      profileCompletion: Number(profileRaw.profileCompletion ?? 0),
      profileSlug: profileRaw.profileSlug != null ? String(profileRaw.profileSlug) : null,
      uuid: profileRaw.uuid != null ? String(profileRaw.uuid) : undefined,
      isIdentityVerified:
        profileRaw.isIdentityVerified != null ? Boolean(profileRaw.isIdentityVerified) : undefined,
      verificationOn:
        profileRaw.verificationOn != null ? Boolean(profileRaw.verificationOn) : undefined,
    },
    cycles: normalizeCycles(data.cycles),
    properties: normalizeProperties(data.properties),
  }
}

export async function fetchScoreProfile(): Promise<ScoreProfileData> {
  const res = await request<unknown>('/user/auth/score-profile', { method: 'GET' })
  return normalizeScoreProfile(res)
}

export function useScoreProfile() {
  return useQuery({
    queryKey: ['score-profile'],
    queryFn: fetchScoreProfile,
    staleTime: 60_000,
  })
}
