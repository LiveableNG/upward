import type { Complaint } from '@/features/my-home/types'

export function displayComplaintStatus(status: string): string {
  return status.toLowerCase() === 'completed' ? 'Resolved' : status
}

export function complaintStatusTone(
  status: string,
): 'pending' | 'ongoing' | 'completed' | 'disputed' {
  const normalized = status.toLowerCase()
  if (['completed', 'resolved'].includes(normalized)) return 'completed'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'disputed') return 'disputed'
  return 'ongoing'
}

export function needsResolutionPrompt(complaint: Complaint): boolean {
  return complaint.status.toLowerCase() === 'completed' && !complaint.rating
}
