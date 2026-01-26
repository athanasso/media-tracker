/**
 * Media Tracker - TypeScript Interfaces
 * Core type definitions for Shows, Movies, and Episodes
 */

// ============================================
// SHOW INTERFACES
// ============================================

export interface Show {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  origin_country: string[];
  original_language: string;
  status: ShowStatus;
  type: string;
  number_of_episodes: number;
  number_of_seasons: number;
  seasons?: Season[];
  networks?: Network[];
  created_by?: Creator[];
  episode_run_time: number[];
  in_production: boolean;
  next_episode_to_air: Episode | null;
  last_episode_to_air: Episode | null;
}

export type ShowStatus = 
  | 'Returning Series'
  | 'Ended'
  | 'Canceled'
  | 'In Production'
  | 'Planned';

export interface ShowListItem {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  overview: string;
  genre_ids: number[];
}

// ============================================
// MOVIE INTERFACES
// ============================================

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  original_language: string;
  runtime: number | null;
  status: MovieStatus;
  tagline: string;
  budget: number;
  revenue: number;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  belongs_to_collection: Collection | null;
  imdb_id: string | null;
  adult: boolean;
  video: boolean;
}

export type MovieStatus = 
  | 'Rumored'
  | 'Planned'
  | 'In Production'
  | 'Post Production'
  | 'Released'
  | 'Canceled';

export interface MovieListItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  genre_ids: number[];
}

// ============================================
// EPISODE & SEASON INTERFACES
// ============================================

export interface Episode {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  show_id: number;
  production_code: string;
  crew?: CrewMember[];
  guest_stars?: CastMember[];
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  vote_average: number;
  episodes?: Episode[];
}

// ============================================
// CAST & CREW INTERFACES
// ============================================

export interface CastMember {
  id: number;
  name: string;
  original_name: string;
  character: string;
  profile_path: string | null;
  order: number;
  gender: number;
  known_for_department: string;
  popularity: number;
  credit_id: string;
  adult: boolean;
}

export interface CrewMember {
  id: number;
  name: string;
  original_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  gender: number;
  known_for_department: string;
  popularity: number;
  credit_id: string;
  adult: boolean;
}

export interface Credits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

// ============================================
// SUPPORTING INTERFACES
// ============================================

export interface Genre {
  id: number;
  name: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface Creator {
  id: number;
  name: string;
  gender: number;
  profile_path: string | null;
  credit_id: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

// ============================================
// TRACKING INTERFACES
// ============================================

export interface WatchedEpisode {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeId: number;
  watchedAt: string; // ISO date string
}

export interface TrackedShow {
  showId: number;
  showName: string;
  posterPath: string | null;
  addedAt: string;
  watchedEpisodes: WatchedEpisode[];
  status: TrackingStatus;
}

export interface TrackedMovie {
  movieId: number;
  movieTitle: string;
  posterPath: string | null;
  addedAt: string;
  watchedAt: string | null;
  status: TrackingStatus;
}

export type TrackingStatus = 
  | 'watching'
  | 'completed'
  | 'plan_to_watch'
  | 'on_hold'
  | 'dropped';

// ============================================
// MEDIA UNION TYPES
// ============================================

export type MediaType = 'tv' | 'movie';

export type MediaItem = Show | Movie;
export type MediaListItem = ShowListItem | MovieListItem;

export interface TrendingItem {
  id: number;
  media_type: MediaType;
  title?: string;  // Movie
  name?: string;   // TV Show
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;  // Movie
  first_air_date?: string; // TV Show
}
