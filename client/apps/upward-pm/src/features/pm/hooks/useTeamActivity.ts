import { useQuery } from '@tanstack/react-query';
import { teamActivityService, TeamActivityQueryParams } from '../services/teamActivityService';

export function useTeamActivityDashboard(params: TeamActivityQueryParams = {}) {
  return useQuery({
    queryKey: ['pm-team-activity-dashboard', params],
    queryFn: () => teamActivityService.getDashboard(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}
