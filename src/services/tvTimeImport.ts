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
  is_watched?: boolean; // User didn't strictly say this exists but implied by "is_watched" in general or derived from watched_at
  watched_at?: string | null;
  id?: TVTimeIds;
}

interface TVTimeSeason {
  number: number;
  episodes: TVTimeEpisode[];
}

interface TVTimeShow {
  title: string;
  status: string; // e.g. 'up_to_date', 'watch_later', 'continuing', 'dead', 'archived'
  seasons: TVTimeSeason[];
  id?: TVTimeIds; // Optional based on description, but usually present
}

// Union type for the parsed JSON array
type TVTimeItem = TVTimeMovie | TVTimeShow;

// ==========================================
// HELPERS
// ==========================================

// Map TV Time status to our status
function mapTVTimeStatus(status: string): TrackingStatus {
  const s = status?.toLowerCase() || '';
  if (s.includes('up_to_date') || s.includes('continuing') || s.includes('watching')) return 'watching';
  if (s.includes('watch_later') || s.includes('plan')) return 'plan_to_watch';
  if (s.includes('dropped') || s.includes('stopped')) return 'dropped';
  if (s.includes('finished') || s.includes('dead') || s.includes('ended') || s.includes('archived')) return 'completed';
  return 'plan_to_watch';
}

// Find item by external ID (TVDB or IMDB)
async function findByExternalId(
  id: string | number,
  source: 'tvdb_id' | 'imdb_id'
): Promise<{ id: number; media_type: string; poster_path: string | null } | null> {
  try {
    const response = await apiClient.get<any>(`/find/${id}`, {
      params: { external_source: source },
    });
    
    const data = response.data;
    
    // Prioritize results based on what we find
    if (data.tv_results?.length > 0) {
      return { ...data.tv_results[0], media_type: 'tv' };
    }
    if (data.movie_results?.length > 0) {
      return { ...data.movie_results[0], media_type: 'movie' };
    }
    if (data.tv_episode_results?.length > 0) {
       return { ...data.tv_episode_results[0], media_type: 'tv' };
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to find by external ID: ${id} (${source})`, error);
    return null;
  }
}

// Search TMDB for a title and get the ID
async function findTMDBMatch(
  item: TVTimeItem,
  type: 'movie' | 'show'
): Promise<{ id: number; posterPath: string | null } | null> {
  try {
    const { title, id } = item;

    // 1. Try IMDB ID
    if (id?.imdb && id.imdb !== '-1' && id.imdb !== '') {
      const match = await findByExternalId(id.imdb, 'imdb_id');
      if (match && ((type === 'movie' && match.media_type === 'movie') || (type === 'show' && match.media_type === 'tv'))) {
        return { 
          id: match.id, 
          posterPath: match.poster_path 
        };
      }
    }

    // 2. Try TVDB ID
    if (id?.tvdb && id.tvdb > 0) {
      const match = await findByExternalId(id.tvdb, 'tvdb_id');
      if (match && ((type === 'movie' && match.media_type === 'movie') || (type === 'show' && match.media_type === 'tv'))) {
         return { 
           id: match.id, 
           posterPath: match.poster_path 
         };
      }
    }

    // 3. Fallback to Title Search
    const results = await searchMulti(title);
    
    if (results.results && results.results.length > 0) {
      if (type === 'show') {
         const tvMatch = results.results.find(r => r.media_type === 'tv');
         if (tvMatch) return { id: tvMatch.id, posterPath: tvMatch.poster_path || null };
      } else {
         const movieMatch = results.results.find(r => r.media_type === 'movie');
         if (movieMatch) return { id: movieMatch.id, posterPath: movieMatch.poster_path || null };
      }
      
      // If strict match failed, check generic
       const first = results.results[0];
       if ((type === 'show' && first.media_type === 'tv') || (type === 'movie' && first.media_type === 'movie')) {
         return { id: first.id, posterPath: first.poster_path || null };
       }
    }

    return null;
  } catch (error) {
    console.error(`Failed to find TMDB ID for: ${item.title}`, error);
    return null;
  }
}

// Import progress callback type
type ProgressCallback = (current: number, total: number, title: string) => void;

/**
 * Import TV Time JSON data
 */
export async function importFromTVTime(
  onProgress?: ProgressCallback
): Promise<{ shows: number; movies: number; failed: string[] }> {
  const result = { shows: 0, movies: 0, failed: [] as string[] };
  const language = useSettingsStore.getState().language;
  const t = strings[language] || strings.en;

  try {
    // Pick the JSON file
    const docResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (docResult.canceled || !docResult.assets?.[0]) {
      return result;
    }

    const pickedFile = docResult.assets[0];
    
    // Read and parse JSON
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

    // Detect Type based on first item
    const firstItem = tvTimeData[0];
    const isShowImport = 'seasons' in firstItem; // Only shows have seasons array

    // Process each item
    for (let i = 0; i < tvTimeData.length; i++) {
      const item = tvTimeData[i];
      
      // Update progress
      onProgress?.(i + 1, total, item.title || 'Unknown');

      // Skip invalid items
      if (!item.title) continue;

      // Find TMDB Match
      const tmdbMatch = await findTMDBMatch(item, isShowImport ? 'show' : 'movie');

      if (!tmdbMatch) {
        result.failed.push(item.title);
        continue;
      }

      if (!isShowImport) {
        // MOVIE PROCESSING (movies.json)
        const movieItem = item as TVTimeMovie;
        const existingMovie = store.trackedMovies.find(m => m.movieId === tmdbMatch.id);
        
        if (!existingMovie) {
          // Determine watched status
          // "watched_at / is_watched": Data regarding viewing history.
          const isWatched = !!movieItem.is_watched || !!movieItem.watched_at;
          
          const movie: TrackedMovie = {
            movieId: tmdbMatch.id,
            movieTitle: movieItem.title,
            posterPath: tmdbMatch.posterPath,
            addedAt: movieItem.watched_at || new Date().toISOString(),
            watchedAt: isWatched ? (movieItem.watched_at || new Date().toISOString()) : null,
            status: isWatched ? 'completed' : 'plan_to_watch',
          };
          newMovies.push(movie);
          result.movies++;
        }
      } else {
        // SHOW PROCESSING (shows.json)
        const showItem = item as TVTimeShow;
        const existingShow = store.trackedShows.find(s => s.showId === tmdbMatch.id);

        if (!existingShow) {
          const watchedEpisodes: WatchedEpisode[] = [];
          const now = new Date().toISOString();

          if (showItem.seasons) {
            for (const season of showItem.seasons) {
              if (!season.episodes) continue;
              
              for (const episode of season.episodes) {
                // "Episode Level: ... special flag, and watched_at status."
                // Only normal episodes unless we want specials? Usually skip specials for metrics correctness unless tracked.
                if (!episode.special && (episode.watched_at || episode.is_watched)) {
                  watchedEpisodes.push({
                    showId: tmdbMatch.id,
                    seasonNumber: season.number,
                    episodeNumber: episode.number,
                    episodeId: episode.id?.tvdb || 0, // Placeholder
                    watchedAt: episode.watched_at || now,
                  });
                }
              }
            }
          }

          const show: TrackedShow = {
            showId: tmdbMatch.id,
            showName: showItem.title,
            posterPath: tmdbMatch.posterPath,
            addedAt: now,
            status: mapTVTimeStatus(showItem.status),
            watchedEpisodes,
          };
          newShows.push(show);
          result.shows++;
        }
      }

      // Add small delay to avoid rate limiting
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Add all new items to store
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
