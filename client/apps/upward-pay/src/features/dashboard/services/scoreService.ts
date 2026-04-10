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
      profileCompletion: number
    }
    cycles: Array<{
      id: number
      uuid: string
      amount: number
      dueDate: string
      paidDate: string | null
      status: string
      ptValue: number
    }>
  }
}

export async function fetchScoreProfile(): Promise<ScoreProfile> {
  return request<ScoreProfile>('/user/auth/score-profile', { method: 'GET' })
}

export function useScoreProfile() {
  return useQuery<ScoreProfile>({
    queryKey: ['scoreProfile'],
    queryFn: fetchScoreProfile,
  })
}
