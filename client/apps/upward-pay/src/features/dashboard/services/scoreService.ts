import { request } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

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
      longestStreak: number
      totalCycles: number
      historyYears: number
      discipline: number
    }
    profile: {
      name: string
      email: string
      phone: string
      profilePic: string
      profileSlug: string | null
      uuid: string
      profileCompletion: number
      isIdentityVerified?: boolean
      bio?: string
      gender?: string
    }
    cycles: Array<{
      id: number
      uuid: string
      amount: number
      dueDate: string
      paidDate: string | null
      status: string
      ptValue: number
      source: string
      excluded: boolean
    }>
    properties: any[]
  }
}

export async function fetchScoreProfile(): Promise<ScoreProfile> {
  return request<ScoreProfile>('/user/auth/score-profile', { method: 'GET' })
}

export function useScoreProfile() {
  return useQuery<ScoreProfile>({
    queryKey: ['scoreProfile'],
    queryFn: fetchScoreProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function usePublicScoreProfile(slug: string) {
  return useQuery<ScoreProfile>({
    queryKey: ['publicScoreProfile', slug],
    queryFn: () => request<ScoreProfile>(`/public/profile/${slug}`, { method: 'GET' }),
    enabled: !!slug,
  })
}
