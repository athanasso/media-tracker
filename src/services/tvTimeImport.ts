/**
 * TV Time Import Service
 * Parses TV Time JSON export and converts to our format
 */

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Alert } from 'react-native';

import { strings } from '@/src/i18n/strings';
import { apiClient, searchMulti } from '@/src/services/api';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackingStatus, WatchedEpisode } from '@/src/types';

// ==========================================
// TV TIME JSON TYPES
// ==========================================

interface TVTimeIds {
  tvdb?: number | null;
  imdb?: string | null;
}

// 1. Movies Structure
interface TVTimeMovie {
  uuid?: string;
  title: string;
  id?: TVTimeIds;
  watched_at?: string | null;
  is_watched?: boolean;
}

// 2. Shows Structure
interface TVTimeEpisode {
  number: number;
  special: boolean;
  is_watched?: boolean;
  watched_at?: string | null;
  id?: TVTimeIds;
}

interface TVTimeSeason {
  number: number;
  episodes: TVTimeEpisode[];
}

interface TVTimeShow {
  title: string;
  status: string;
  seasons: TVTimeSeason[];
  id?: TVTimeIds;
}

// Union type for the parsed JSON array
type TVTimeItem = TVTimeMovie | TVTimeShow;

export interface PendingImportItem {
  original: TVTimeItem;
  match: {
    id: number;
    title?: string;
    media_type: 'tv' | 'movie';
    posterPath: string | null;
    releaseDate?: string;
  };
  type: 'movie' | 'show';
}

// ==========================================
// HELPERS
// ==========================================

function mapTVTimeStatus(status: string): TrackingStatus {
  const s = status?.toLowerCase() || '';
  if (s.includes('up_to_date') || s.includes('continuing') || s.includes('watching')) return 'watching';
  if (s.includes('watch_later') || s.includes('plan')) return 'plan_to_watch';
  if (s.includes('dropped') || s.includes('stopped')) return 'dropped';
  if (s.includes('finished') || s.includes('dead') || s.includes('ended') || s.includes('archived')) return 'completed';
  return 'plan_to_watch';
}

async function findByExternalId(
  id: string | number,
  source: 'tvdb_id' | 'imdb_id'
): Promise<{ id: number; media_type: string; poster_path: string | null } | null> {
  try {
    const response = await apiClient.get<any>(`/find/${id}`, {
      params: { external_source: source },
    });
    
    const data = response.data;
    
    if (data.tv_results?.length > 0) return { ...data.tv_results[0], media_type: 'tv' };
    if (data.movie_results?.length > 0) return { ...data.movie_results[0], media_type: 'movie' };
    if (data.tv_episode_results?.length > 0) return { ...data.tv_episode_results[0], media_type: 'tv' };
    
    return null;
  } catch (error) {
    console.error(`Failed to find by external ID: ${id} (${source})`, error);
    return null;
  }
}

async function findTMDBMatch(
  item: TVTimeItem,
  type: 'movie' | 'show'
): Promise<{ id: number; media_type: 'tv' | 'movie'; posterPath: string | null; title?: string; releaseDate?: string; isExactMatch: boolean } | null> {
  try {
    const { title, id } = item;

    // 1. Try IMDB ID
    if (id?.imdb && id.imdb !== '-1' && id.imdb !== '') {
      const match = await findByExternalId(id.imdb, 'imdb_id');
      if (match && ((type === 'movie' && match.media_type === 'movie') || (type === 'show' && match.media_type === 'tv'))) {
        return { 
          id: match.id, 
          media_type: match.media_type as 'tv' | 'movie',
          posterPath: match.poster_path,
          isExactMatch: true
        };
      }
    }

    // 2. Try TVDB ID
    if (id?.tvdb && id.tvdb > 0) {
      const match = await findByExternalId(id.tvdb, 'tvdb_id');
      if (match && ((type === 'movie' && match.media_type === 'movie') || (type === 'show' && match.media_type === 'tv'))) {
         return { 
           id: match.id, 
           media_type: match.media_type as 'tv' | 'movie',
           posterPath: match.poster_path,
           isExactMatch: true
         };
      }
    }

    // 3. Fallback to Title Search
    const results = await searchMulti(title);
    
    if (results.results && results.results.length > 0) {
      if (type === 'show') {
         const tvMatch = results.results.find(r => r.media_type === 'tv');
         if (tvMatch) return { 
             id: tvMatch.id, 
             media_type: 'tv', 
             posterPath: tvMatch.poster_path || null,
             title: tvMatch.name,
             releaseDate: tvMatch.first_air_date,
             isExactMatch: false 
         };
      } else {
         const movieMatch = results.results.find(r => r.media_type === 'movie');
         if (movieMatch) return { 
             id: movieMatch.id, 
             media_type: 'movie', 
             posterPath: movieMatch.poster_path || null,
             title: movieMatch.title,
             releaseDate: movieMatch.release_date,
             isExactMatch: false 
         };
      }
      
       const first = results.results[0];
       if ((type === 'show' && first.media_type === 'tv') || (type === 'movie' && first.media_type === 'movie')) {
         return { 
             id: first.id, 
             media_type: first.media_type,
             posterPath: first.poster_path || null,
             title: (first as any).title || (first as any).name,
             isExactMatch: false
         };
       }
    }

    return null;
  } catch (error) {
    console.error(`Failed to find TMDB ID for: ${item.title}`, error);
    return null;
  }
}

function createTrackedMovie(item: TVTimeMovie, tmdbId: number, posterPath: string | null): TrackedMovie {
  const isWatched = !!item.is_watched || !!item.watched_at;
  return {
    movieId: tmdbId,
    movieTitle: item.title,
    posterPath: posterPath,
    addedAt: item.watched_at || new Date().toISOString(),
    watchedAt: isWatched ? (item.watched_at || new Date().toISOString()) : null,
    status: isWatched ? 'completed' : 'plan_to_watch',
  };
}

function createTrackedShow(item: TVTimeShow, tmdbId: number, posterPath: string | null): TrackedShow {
  const watchedEpisodes: WatchedEpisode[] = [];
  const now = new Date().toISOString();

  if (item.seasons) {
    for (const season of item.seasons) {
      if (!season.episodes) continue;
      
      for (const episode of season.episodes) {
        if (!episode.special && (episode.watched_at || episode.is_watched)) {
          watchedEpisodes.push({
            showId: tmdbId,
            seasonNumber: season.number,
            episodeNumber: episode.number,
            episodeId: episode.id?.tvdb || 0,
            watchedAt: episode.watched_at || now,
          });
        }
      }
    }
  }

  return {
    showId: tmdbId,
    showName: item.title,
    posterPath: posterPath,
    addedAt: now,
    status: mapTVTimeStatus(item.status),
    watchedEpisodes,
  };
}

export function processPendingImports(
    items: PendingImportItem[]
): { shows: number; movies: number } {
    const store = useWatchlistStore.getState();
    const newShows: TrackedShow[] = [];
    const newMovies: TrackedMovie[] = [];
    let showCount = 0;
    let movieCount = 0;

    items.forEach(pending => {
        if (pending.type === 'movie') {
            const movie = createTrackedMovie(pending.original as TVTimeMovie, pending.match.id, pending.match.posterPath);
            if (!store.trackedMovies.find(m => m.movieId === movie.movieId)) {
                newMovies.push(movie);
                movieCount++;
            }
        } else {
            const show = createTrackedShow(pending.original as TVTimeShow, pending.match.id, pending.match.posterPath);
             if (!store.trackedShows.find(s => s.showId === show.showId)) {
                newShows.push(show);
                showCount++;
            }
        }
    });

    if (newShows.length > 0 || newMovies.length > 0) {
      useWatchlistStore.setState({
        trackedShows: [...store.trackedShows, ...newShows],
        trackedMovies: [...store.trackedMovies, ...newMovies],
      });
    }

    return { shows: showCount, movies: movieCount };
}

type ProgressCallback = (current: number, total: number, title: string) => void;

export async function importFromTVTime(
  onProgress?: ProgressCallback
): Promise<{ shows: number; movies: number; failed: string[]; pending: PendingImportItem[] }> {
  const result = { shows: 0, movies: 0, failed: [] as string[], pending: [] as PendingImportItem[] };
  const language = useSettingsStore.getState().language;
  const t = strings[language] || strings.en;

  try {
    const docResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (docResult.canceled || !docResult.assets?.[0]) return result;

    const pickedFile = docResult.assets[0];
    const file = new File(pickedFile.uri);
    const content = await file.text();
    let tvTimeData: TVTimeItem[];

    try {
      tvTimeData = JSON.parse(content);
    } catch (e) {
      Alert.alert(t.invalidJsonTitle, t.invalidJsonMessage);
      return result;
    }

    if (!Array.isArray(tvTimeData)) {
      Alert.alert(t.invalidFormatTitle, t.invalidFormatMessage);
      return result;
    }

    const store = useWatchlistStore.getState();
    const newShows: TrackedShow[] = [];
    const newMovies: TrackedMovie[] = [];
    const total = tvTimeData.length;
    
    const existingShowIds = new Set(store.trackedShows.map(s => s.showId));
    const existingMovieIds = new Set(store.trackedMovies.map(m => m.movieId));

    // Detect Type based on first item being processed (simple check, or we could pass it in)
    // We can just check the first item to see if it has 'seasons'
    const firstItem = tvTimeData[0];
    const isShowImport = 'seasons' in firstItem;

    for (let i = 0; i < tvTimeData.length; i++) {
      const item = tvTimeData[i];
      onProgress?.(i + 1, total, item.title || 'Unknown');

      if (!item.title) continue;

      const tmdbMatch = await findTMDBMatch(item, isShowImport ? 'show' : 'movie');

      if (!tmdbMatch) {
        result.failed.push(item.title);
        continue;
      }

      if (!tmdbMatch.isExactMatch) {
          result.pending.push({
              original: item,
              match: {
                  id: tmdbMatch.id,
                  title: tmdbMatch.title,
                  media_type: tmdbMatch.media_type,
                  posterPath: tmdbMatch.posterPath,
                  releaseDate: tmdbMatch.releaseDate,
              },
              type: isShowImport ? 'show' : 'movie'
          });
          continue;
      }

      if (tmdbMatch.media_type === 'movie') {
        if (!existingMovieIds.has(tmdbMatch.id)) {
          const movie = createTrackedMovie(item as TVTimeMovie, tmdbMatch.id, tmdbMatch.posterPath);
          newMovies.push(movie);
          existingMovieIds.add(tmdbMatch.id);
          result.movies++;
        }
      } else {
        if (!existingShowIds.has(tmdbMatch.id)) {
          const show = createTrackedShow(item as TVTimeShow, tmdbMatch.id, tmdbMatch.posterPath);
          newShows.push(show);
          existingShowIds.add(tmdbMatch.id);
          result.shows++;
        }
      }

      if (i % 5 === 0) await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (newShows.length > 0 || newMovies.length > 0) {
      useWatchlistStore.setState({
        trackedShows: [...store.trackedShows, ...newShows],
        trackedMovies: [...store.trackedMovies, ...newMovies],
      });
    }

    return result;
  } catch (error) {
    console.error('TV Time import error:', error);
    Alert.alert(t.importFailedTitle, t.importFailedMessage);
    return result;
  }
}
export default { importFromTVTime };
