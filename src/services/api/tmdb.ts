/**
 * TMDB API Service
 * All API endpoint functions for TV Shows and Movies
 */

import {
    AiringTodayResponse,
    Credits,
    GenresResponse,
    MovieDetailsResponse,
    MultiSearchResponse,
    NowPlayingResponse,
    OnTheAirResponse,
    PopularMoviesResponse,
    PopularShowsResponse,
    SearchMoviesResponse,
    SearchShowsResponse,
    SeasonDetailsResponse,
    ShowDetailsResponse,
    TopRatedMoviesResponse,
    TopRatedShowsResponse,
    TrendingAllResponse,
    TrendingMoviesResponse,
    TrendingShowsResponse,
    UpcomingMoviesResponse,
    WatchProvidersResponse,
} from '../../types';
import { apiClient } from './client';

// ============================================
// TRENDING
// ============================================

/**
 * Get trending items (all media types)
 */
export const getTrendingAll = async (
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TrendingAllResponse> => {
  const response = await apiClient.get<TrendingAllResponse>(
    `/trending/all/${timeWindow}`,
    { params: { page } }
  );
  return response.data;
};

/**
 * Get trending TV shows
 */
export const getTrendingShows = async (
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TrendingShowsResponse> => {
  const response = await apiClient.get<TrendingShowsResponse>(
    `/trending/tv/${timeWindow}`,
    { params: { page } }
  );
  return response.data;
};

/**
 * Get trending movies
 */
export const getTrendingMovies = async (
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TrendingMoviesResponse> => {
  const response = await apiClient.get<TrendingMoviesResponse>(
    `/trending/movie/${timeWindow}`,
    { params: { page } }
  );
  return response.data;
};

// ============================================
// TV SHOWS
// ============================================

/**
 * Get popular TV shows
 */
export const getPopularShows = async (
  page: number = 1
): Promise<PopularShowsResponse> => {
  const response = await apiClient.get<PopularShowsResponse>('/tv/popular', {
    params: { page },
  });
  return response.data;
};

/**
 * Get top rated TV shows
 */
export const getTopRatedShows = async (
  page: number = 1
): Promise<TopRatedShowsResponse> => {
  const response = await apiClient.get<TopRatedShowsResponse>('/tv/top_rated', {
    params: { page },
  });
  return response.data;
};

/**
 * Get TV shows airing today
 */
export const getAiringToday = async (
  page: number = 1
): Promise<AiringTodayResponse> => {
  const response = await apiClient.get<AiringTodayResponse>('/tv/airing_today', {
    params: { page },
  });
  return response.data;
};

/**
 * Get TV shows currently on the air
 */
export const getOnTheAir = async (
  page: number = 1
): Promise<OnTheAirResponse> => {
  const response = await apiClient.get<OnTheAirResponse>('/tv/on_the_air', {
    params: { page },
  });
  return response.data;
};

/**
 * Get TV show details by ID
 */
export const getShowDetails = async (
  showId: number,
  appendToResponse?: string[]
): Promise<ShowDetailsResponse> => {
  const params: any = {};
  if (appendToResponse !== undefined) {
    if (appendToResponse.length > 0) {
      params.append_to_response = appendToResponse.join(',');
    }
  } else {
    params.append_to_response = 'credits,similar,videos';
  }

  const response = await apiClient.get<ShowDetailsResponse>(`/tv/${showId}`, {
    params,
  });
  return response.data;
};

/**
 * Get TV show credits (cast & crew)
 */
export const getShowCredits = async (showId: number): Promise<Credits> => {
  const response = await apiClient.get<Credits>(`/tv/${showId}/credits`);
  return response.data;
};

/**
 * Get season details with episodes
 */
export const getSeasonDetails = async (
  showId: number,
  seasonNumber: number
): Promise<SeasonDetailsResponse> => {
  const response = await apiClient.get<SeasonDetailsResponse>(
    `/tv/${showId}/season/${seasonNumber}`
  );
  return response.data;
};

/**
 * Get episode details
 */
export const getEpisodeDetails = async (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<any> => {
  const response = await apiClient.get(
    `/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`
  );
  return response.data;
};

// ============================================
// MOVIES
// ============================================

/**
 * Get popular movies
 */
export const getPopularMovies = async (
  page: number = 1
): Promise<PopularMoviesResponse> => {
  const response = await apiClient.get<PopularMoviesResponse>('/movie/popular', {
    params: { page },
  });
  return response.data;
};

/**
 * Get top rated movies
 */
export const getTopRatedMovies = async (
  page: number = 1
): Promise<TopRatedMoviesResponse> => {
  const response = await apiClient.get<TopRatedMoviesResponse>('/movie/top_rated', {
    params: { page },
  });
  return response.data;
};

/**
 * Get movies now playing in theaters
 */
export const getNowPlaying = async (
  page: number = 1
): Promise<NowPlayingResponse> => {
  const response = await apiClient.get<NowPlayingResponse>('/movie/now_playing', {
    params: { page },
  });
  return response.data;
};

/**
 * Get upcoming movies
 */
export const getUpcomingMovies = async (
  page: number = 1
): Promise<UpcomingMoviesResponse> => {
  const response = await apiClient.get<UpcomingMoviesResponse>('/movie/upcoming', {
    params: { page },
  });
  return response.data;
};

/**
 * Get movie details by ID
 */
export const getMovieDetails = async (
  movieId: number,
  appendToResponse?: string[]
): Promise<MovieDetailsResponse> => {
  const response = await apiClient.get<MovieDetailsResponse>(`/movie/${movieId}`, {
    params: {
      append_to_response: appendToResponse?.join(',') || 'credits,similar,videos',
    },
  });
  return response.data;
};

/**
 * Get movie credits (cast & crew)
 */
export const getMovieCredits = async (movieId: number): Promise<Credits> => {
  const response = await apiClient.get<Credits>(`/movie/${movieId}/credits`);
  return response.data;
};

// ============================================
// SEARCH
// ============================================

/**
 * Search for TV shows
 */
export const searchShows = async (
  query: string,
  page: number = 1
): Promise<SearchShowsResponse> => {
  const response = await apiClient.get<SearchShowsResponse>('/search/tv', {
    params: { query, page },
  });
  return response.data;
};

/**
 * Search for movies
 */
export const searchMovies = async (
  query: string,
  page: number = 1
): Promise<SearchMoviesResponse> => {
  const response = await apiClient.get<SearchMoviesResponse>('/search/movie', {
    params: { query, page },
  });
  return response.data;
};

/**
 * Multi-search (TV shows, movies, and people)
 */
export const searchMulti = async (
  query: string,
  page: number = 1
): Promise<MultiSearchResponse> => {
  const response = await apiClient.get<MultiSearchResponse>('/search/multi', {
    params: { query, page },
  });
  return response.data;
};

// ============================================
// GENRES
// ============================================

/**
 * Get TV show genres
 */
export const getTVGenres = async (): Promise<GenresResponse> => {
  const response = await apiClient.get<GenresResponse>('/genre/tv/list');
  return response.data;
};

/**
 * Get movie genres
 */
export const getMovieGenres = async (): Promise<GenresResponse> => {
  const response = await apiClient.get<GenresResponse>('/genre/movie/list');
  return response.data;
};

// ============================================
// DISCOVER
// ============================================

/**
 * Discover TV shows with filters
 */
export const discoverShows = async (params: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
  vote_average_gte?: number;
}): Promise<PopularShowsResponse> => {
  const response = await apiClient.get<PopularShowsResponse>('/discover/tv', {
    params,
  });
  return response.data;
};

/**
 * Discover movies with filters
 */
export const discoverMovies = async (params: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  release_date_gte?: string;
  release_date_lte?: string;
  vote_average_gte?: number;
}): Promise<PopularMoviesResponse> => {
  const response = await apiClient.get<PopularMoviesResponse>('/discover/movie', {
    params,
  });
  return response.data;
};

// ============================================
// WATCH PROVIDERS
// ============================================

/**
 * Get watch providers for a movie
 */
export const getMovieWatchProviders = async (movieId: number): Promise<WatchProvidersResponse> => {
  const response = await apiClient.get<WatchProvidersResponse>(`/movie/${movieId}/watch/providers`);
  return response.data;
};

/**
 * Get watch providers for a TV show
 */
export const getShowWatchProviders = async (showId: number): Promise<WatchProvidersResponse> => {
  const response = await apiClient.get<WatchProvidersResponse>(`/tv/${showId}/watch/providers`);
  return response.data;
};
