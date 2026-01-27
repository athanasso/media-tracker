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

interface TVTimeEpisodeIDs {
  tvdb: number;
  imdb: string | null;
}

interface TVTimeEpisode {
  number: number;
  special: boolean;
  is_watched: boolean;
  watched_at: string | null; // "YYYY-MM-DD HH:MM:SS" or null
  id: TVTimeEpisodeIDs;
}

interface TVTimeSeason {
  number: number;
  episodes: TVTimeEpisode[];
}

interface TVTimeShowIDs {
  tvdb: number | null;
  imdb: string | null;
}

interface TVTimeShow {
  uuid: string;
  title: string;
  status: string; // e.g. 'up_to_date', 'watch_later', 'continuing'
  id: TVTimeShowIDs;
  created_at: string;
  seasons?: TVTimeSeason[]; // User said "Seasons (Array)" so it should be present for shows
}

// ==========================================
// HELPERS
// ==========================================

// Map TV Time status to our status
function mapTVTimeStatus(status: string): TrackingStatus {
  switch (status) {
    case 'up_to_date':
    case 'continuing':
      return 'watching';
    case 'watch_later':
      return 'plan_to_watch';
    case 'stopped':
      return 'dropped';
    case 'finished':
    case 'completed':
      return 'completed';
    default:
      return 'plan_to_watch';
  }
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
// Returns object with id, media_type ('tv' or 'movie'), and poster_path
async function findTMDBMatch(
  item: TVTimeShow
): Promise<{ id: number; media_type: 'tv' | 'movie'; posterPath: string | null } | null> {
  try {
    const { id, title } = item;

    // 1. Try IMDB ID
    if (id.imdb && id.imdb !== '-1' && id.imdb !== '') {
      const match = await findByExternalId(id.imdb, 'imdb_id');
      if (match) {
        return { 
          id: match.id, 
          media_type: match.media_type as 'tv' | 'movie', // Trust external ID type
          posterPath: match.poster_path 
        };
      }
    }

    // 2. Try TVDB ID
    if (id.tvdb && id.tvdb > 0) {
      const match = await findByExternalId(id.tvdb, 'tvdb_id');
      if (match) {
         return { 
           id: match.id, 
           media_type: match.media_type as 'tv' | 'movie',
           posterPath: match.poster_path 
         };
      }
    }

    // 3. Fallback to Title Search
    const results = await searchMulti(title);
    
    if (results.results && results.results.length > 0) {
      // Prefer TV show if available
      const tvMatch = results.results.find(r => r.media_type === 'tv');
      if (tvMatch) {
        return { id: tvMatch.id, media_type: 'tv', posterPath: tvMatch.poster_path || null };
      }
      
      // Otherwise take first match (could be movie)
      const first = results.results[0];
      if (first.media_type === 'movie' || first.media_type === 'tv') {
        return { id: first.id, media_type: first.media_type, posterPath: first.poster_path || null };
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
    let tvTimeData: TVTimeShow[];

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

    // Process each item
    for (let i = 0; i < tvTimeData.length; i++) {
      const item = tvTimeData[i];
      
      // Update progress
      onProgress?.(i + 1, total, item.title || 'Unknown');

      // Skip invalid items
      if (!item.title) continue;

      // Find TMDB Match
      const tmdbMatch = await findTMDBMatch(item);

      if (!tmdbMatch) {
        result.failed.push(item.title);
        continue;
      }

      if (tmdbMatch.media_type === 'movie') {
        // MOVIE PROCESSING
        const existingMovie = store.trackedMovies.find(m => m.movieId === tmdbMatch.id);
        
        if (!existingMovie) {
          // Determine watched status from item status
          const isWatched = item.status === 'finished' || item.status === 'completed';
          
          const movie: TrackedMovie = {
            movieId: tmdbMatch.id,
            movieTitle: item.title,
            posterPath: tmdbMatch.posterPath,
            addedAt: item.created_at || new Date().toISOString(),
            watchedAt: isWatched ? new Date().toISOString() : null,
            status: isWatched ? 'completed' : 'plan_to_watch',
          };
          newMovies.push(movie);
          result.movies++;
        }
      } else {
        // SHOW PROCESSING
        const existingShow = store.trackedShows.find(s => s.showId === tmdbMatch.id);

        if (!existingShow) {
          const watchedEpisodes: WatchedEpisode[] = [];

          if (item.seasons) {
            for (const season of item.seasons) {
              if (!season.episodes) continue;
              
              for (const episode of season.episodes) {
                // Skips special episodes (e.g. OVA) unless we want them. 
                // User said "Special (Boolean): Flag for OVA/Special content" but didn't say to include/exclude.
                // Standard behavior is usually to track standard episodes.
                if (episode.is_watched && !episode.special) {
                  watchedEpisodes.push({
                    showId: tmdbMatch.id,
                    seasonNumber: season.number,
                    episodeNumber: episode.number,
                    episodeId: episode.id?.tvdb || 0, // Placeholder
                    watchedAt: episode.watched_at || new Date().toISOString(),
                  });
                }
              }
            }
          }

          const show: TrackedShow = {
            showId: tmdbMatch.id,
            showName: item.title,
            posterPath: tmdbMatch.posterPath,
            addedAt: item.created_at || new Date().toISOString(),
            status: mapTVTimeStatus(item.status),
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
