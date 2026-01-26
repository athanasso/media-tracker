/**
 * TMDB API Response Types
 * Typed responses for all API endpoints
 */

import {
    Credits,
    Episode,
    Genre,
    Movie,
    MovieListItem,
    Season,
    Show,
    ShowListItem,
    TrendingItem
} from './media';

// ============================================
// PAGINATED RESPONSE
// ============================================

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// ============================================
// TV SHOW RESPONSES
// ============================================

export type TrendingShowsResponse = PaginatedResponse<ShowListItem>;
export type PopularShowsResponse = PaginatedResponse<ShowListItem>;
export type TopRatedShowsResponse = PaginatedResponse<ShowListItem>;
export type AiringTodayResponse = PaginatedResponse<ShowListItem>;
export type OnTheAirResponse = PaginatedResponse<ShowListItem>;
export type SearchShowsResponse = PaginatedResponse<ShowListItem>;

export interface ShowDetailsResponse extends Show {
  credits?: Credits;
  similar?: PaginatedResponse<ShowListItem>;
  recommendations?: PaginatedResponse<ShowListItem>;
  videos?: VideosResponse;
  images?: ImagesResponse;
}

export interface SeasonDetailsResponse extends Season {
  _id: string;
  episodes: Episode[];
}

// ============================================
// MOVIE RESPONSES
// ============================================

export type TrendingMoviesResponse = PaginatedResponse<MovieListItem>;
export type PopularMoviesResponse = PaginatedResponse<MovieListItem>;
export type TopRatedMoviesResponse = PaginatedResponse<MovieListItem>;
export type NowPlayingResponse = PaginatedResponse<MovieListItem>;
export type UpcomingMoviesResponse = PaginatedResponse<MovieListItem>;
export type SearchMoviesResponse = PaginatedResponse<MovieListItem>;

export interface MovieDetailsResponse extends Movie {
  credits?: Credits;
  similar?: PaginatedResponse<MovieListItem>;
  recommendations?: PaginatedResponse<MovieListItem>;
  videos?: VideosResponse;
  images?: ImagesResponse;
}

// ============================================
// MULTI-SEARCH RESPONSE
// ============================================

export type TrendingAllResponse = PaginatedResponse<TrendingItem>;

export interface MultiSearchResult {
  id: number;
  media_type: 'tv' | 'movie' | 'person';
  // TV Show fields
  name?: string;
  first_air_date?: string;
  // Movie fields
  title?: string;
  release_date?: string;
  // Common fields
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
  // Person fields
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: MultiSearchResult[];
}

export type MultiSearchResponse = PaginatedResponse<MultiSearchResult>;

// ============================================
// SUPPORTING RESPONSES
// ============================================

export interface GenresResponse {
  genres: Genre[];
}

export interface VideosResponse {
  id: number;
  results: Video[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: VideoType;
  official: boolean;
  published_at: string;
  iso_639_1: string;
  iso_3166_1: string;
}

export type VideoType = 
  | 'Trailer'
  | 'Teaser'
  | 'Clip'
  | 'Featurette'
  | 'Behind the Scenes'
  | 'Bloopers'
  | 'Opening Credits';

export interface ImagesResponse {
  id: number;
  backdrops: ImageData[];
  posters: ImageData[];
  logos: ImageData[];
}

export interface ImageData {
  aspect_ratio: number;
  height: number;
  width: number;
  file_path: string;
  vote_average: number;
  vote_count: number;
  iso_639_1: string | null;
}

// ============================================
// CONFIGURATION RESPONSE
// ============================================

export interface ConfigurationResponse {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}

// ============================================
// ERROR RESPONSE
// ============================================

export interface TMDBErrorResponse {
  success: boolean;
  status_code: number;
  status_message: string;
}
