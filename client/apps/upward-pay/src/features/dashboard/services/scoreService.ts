import { request } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

export interface ScoreCycle {
  id: number
  uuid: string
  amount: number
  amountPaid?: number
  dueDate: string
  paidDate: string | null
  status: string
  ptValue: number
  timelinessPoints?: number
  timelinessTier?: string
  isOnTime?: boolean
  source: string
  excluded: boolean
}

export interface ScoreProperty {
  id?: number
  uuid?: string
  isVerified?: boolean
  isPmVerified?: boolean
  isPlatformLinked?: boolean
  isPastTenancy?: boolean
  rentStartDate?: string | null
  rentEndDate?: string | null
  pm?: { isVerified?: boolean } | null
  company?: { platformId?: number | null } | null
  location?: {
    address?: string
    area?: string
    state?: string
    country?: string
  } | null
}

export interface ScoreProfile {
  success: boolean
  data: {
    isScorable: boolean
    score: number
    maxScore: number
    band: string
    rank: string
    metrics: {
      ptPercentage: number
      timelinessScorePct?: number
      earlyPaymentCount?: number
      longestStreak: number
      currentStreak?: number
      totalCycles: number
      historyYears: number
      discipline: number
      savingsBonus?: number
      avgDaysLeadTime?: number
      breakdown?: {
        base: number
        timeliness: number
        maxTimeliness: number
        streak: number
        maxStreak: number
        discipline: number
        maxDiscipline: number
        tenure: number
        maxTenure: number
        savingsBonus: number
        maxSavingsBonus: number
      }
    }
    scoreHistory?: Array<{
      id: string
      date: string
      title: string
      subtitle: string
      delta: number
      scoreAfter: number
      category: string
    }>
    profile: {
      name: string
      email: string
      phone: string
      profilePic: string
      profileSlug: string | null
      uuid: string
      profileCompletion: number
      isIdentityVerified?: boolean
      verificationOn?: boolean
      bio?: string
      gender?: string
    }
    cycles: ScoreCycle[]
    properties: ScoreProperty[]
  }
}

export async function fetchScoreProfile(): Promise<ScoreProfile> {
  return request<ScoreProfile>('/user/auth/score-profile', { method: 'GET' })
}

export function useScoreProfile() {
  return useQuery<ScoreProfile>({
    queryKey: ['scoreProfile'],
    queryFn: fetchScoreProfile,
    staleTime: 60 * 1000,
  })
}

export function usePublicScoreProfile(slug: string) {
  return useQuery<ScoreProfile>({
    queryKey: ['publicScoreProfile', slug],
    queryFn: () => request<ScoreProfile>(`/public/profile/${slug}`, { method: 'GET' }),
    enabled: !!slug,
    staleTime: 60 * 1000,
  })
}
