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
// WATCH PROVIDERS INTERFACES
// ============================================

export interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface WatchProvidersResponse {
  id: number;
  results: Record<string, {
    link: string;
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
  }>;
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
  isFavorite?: boolean;
  // Stats support
  genres?: Genre[];
  episodeRunTime?: number[]; // from API
  nextAirDate?: string | null; // Caching for calendar
  totalEpisodes?: number;
  seasons?: { seasonNumber: number; episodeCount: number }[];
}

export interface TrackedMovie {
  movieId: number;
  movieTitle: string;
  posterPath: string | null;
  addedAt: string;
  watchedAt: string | null;
  status: TrackingStatus;
  isFavorite?: boolean;
  // Stats support
  genres?: Genre[];
  runtime?: number | null;
  releaseDate?: string | null; // Caching for calendar
}

export type TrackingStatus = 
  | 'watching'
  | 'completed'
  | 'plan_to_watch'
  | 'on_hold'
  | 'dropped';

// ============================================
// BOOK INTERFACES (Google Books)
// ============================================

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  pageCount: number;
  publishedDate: string;
  publisher: string;
  imageLinks: {
    thumbnail: string | null;
    smallThumbnail: string | null;
  } | null;
  averageRating?: number;
  ratingsCount?: number;
  categories?: string[];
  language?: string;
  infoLink?: string;
}

export interface TrackedBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  addedAt: string;
  status: TrackingStatus;
  currentPage: number;
  totalPages: number;
  rating?: number;
  isFavorite?: boolean;
}

// ============================================
// MANGA INTERFACES (Anilist)
// ============================================

export interface Manga {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  description: string;
  coverImage: {
    large: string;
    medium: string;
    color: string | null;
  };
  bannerImage: string | null;
  startDate: {
    year: number;
    month: number;
    day: number;
  };
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
  chapters: number | null;
  volumes: number | null;
  averageScore: number;
  popularity: number;
  genres: string[];
  format: 'MANGA' | 'NOVEL' | 'ONE_SHOT';
}

export interface TrackedManga {
  id: number;
  title: string;
  coverUrl: string | null;
  addedAt: string;
  status: TrackingStatus;
  currentChapter: number;
  totalChapters: number; // 0 if unknown
  currentVolume: number;
  totalVolumes: number; // 0 if unknown
  rating?: number;
  isFavorite?: boolean;
}

// ============================================
// MEDIA UNION TYPES
// ============================================

export type MediaType = 'tv' | 'movie' | 'book' | 'manga';

export type MediaItem = Show | Movie | Book | Manga;
export type MediaListItem = ShowListItem | MovieListItem | Book | Manga;

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
