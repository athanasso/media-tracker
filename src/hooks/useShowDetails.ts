/**
 * useShowDetails Hook
 * Custom hook for fetching show details and season data with TanStack Query
 */

import { getSeasonDetails, getShowDetails } from '@/src/services/api';
import { SeasonDetailsResponse, ShowDetailsResponse } from '@/src/types';
import { useQuery } from '@tanstack/react-query';

interface UseShowDetailsOptions {
  showId: number;
  selectedSeason?: number;
  enabled?: boolean;
}

interface UseShowDetailsReturn {
  // Show data
  show: ShowDetailsResponse | undefined;
  isLoadingShow: boolean;
  isErrorShow: boolean;
  errorShow: Error | null;
  refetchShow: () => void;

  // Season data
  season: SeasonDetailsResponse | undefined;
  isLoadingSeason: boolean;
  isErrorSeason: boolean;
  errorSeason: Error | null;
  refetchSeason: () => void;

  // Combined states
  isLoading: boolean;
  isError: boolean;
}

export function useShowDetails({
  showId,
  selectedSeason = 1,
  enabled = true,
}: UseShowDetailsOptions): UseShowDetailsReturn {
  // Fetch show details with credits and similar shows
  const {
    data: show,
    isLoading: isLoadingShow,
    isError: isErrorShow,
    error: errorShow,
    refetch: refetchShow,
  } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => getShowDetails(showId, ['credits', 'similar', 'videos']),
    enabled: enabled && !!showId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch season details with episodes
  const {
    data: season,
    isLoading: isLoadingSeason,
    isError: isErrorSeason,
    error: errorSeason,
    refetch: refetchSeason,
  } = useQuery({
    queryKey: ['season', showId, selectedSeason],
    queryFn: () => getSeasonDetails(showId, selectedSeason),
    enabled: enabled && !!showId && selectedSeason > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return {
    // Show data
    show,
    isLoadingShow,
    isErrorShow,
    errorShow: errorShow as Error | null,
    refetchShow,

    // Season data
    season,
    isLoadingSeason,
    isErrorSeason,
    errorSeason: errorSeason as Error | null,
    refetchSeason,

    // Combined states
    isLoading: isLoadingShow || isLoadingSeason,
    isError: isErrorShow || isErrorSeason,
  };
}

export default useShowDetails;
