/**
 * TV Time Import Service
 * Parses TV Time JSON export and converts to our format
 */

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Alert } from 'react-native';

import { searchMulti } from '@/src/services/api';
import { useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackingStatus, WatchedEpisode } from '@/src/types';

// TV Time JSON Types
interface TVTimeEpisode {
  id: {
    tvdb: number;
    imdb: string;
  };
  number: number;
  special: boolean;
  is_watched: boolean;
  watched_at: string | null;
}

interface TVTimeSeason {
  number: number;
  episodes: TVTimeEpisode[];
}

interface TVTimeItem {
  uuid: string;
  id: {
    tvdb: number;
    imdb: string;
  };
  title: string;
  created_at: string;
  watched_at?: string;
  is_watched?: boolean;
  seasons?: TVTimeSeason[];
  status?: string;
}

// Map TV Time status to our status
function mapTVTimeStatus(status?: string): TrackingStatus {
  switch (status) {
    case 'up_to_date':
      return 'watching';
    case 'watch_later':
      return 'plan_to_watch';
    case 'stopped':
      return 'dropped';
    case 'finished':
      return 'completed';
    default:
      return 'watching';
  }
}

// Check if item is a movie (no seasons array)
function isMovie(item: TVTimeItem): boolean {
  return !item.seasons || item.seasons.length === 0;
}

// Search TMDB for a title and get the ID
async function findTMDBId(
  title: string,
  isMovie: boolean
): Promise<{ id: number; posterPath: string | null } | null> {
  try {
    const results = await searchMulti(title);
    
    // Filter by media type and find best match
    const matches = results.results?.filter((item) => {
      if (isMovie) {
        return item.media_type === 'movie';
      } else {
        return item.media_type === 'tv';
      }
    });

    if (matches && matches.length > 0) {
      // Return the first match (usually the most relevant)
      const match = matches[0];
      return {
        id: match.id,
        posterPath: match.poster_path || null,
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to find TMDB ID for: ${title}`, error);
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
    const tvTimeData: TVTimeItem[] = JSON.parse(content);

    if (!Array.isArray(tvTimeData)) {
      Alert.alert('Invalid Format', 'The file does not contain valid TV Time data.');
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
      onProgress?.(i + 1, total, item.title);

      // Search TMDB for this title
      const tmdbResult = await findTMDBId(item.title, isMovie(item));

      if (!tmdbResult) {
        result.failed.push(item.title);
        continue;
      }

      if (isMovie(item)) {
        // It's a movie
        const existingMovie = store.trackedMovies.find(
          (m) => m.movieId === tmdbResult.id
        );
        
        if (!existingMovie) {
          const movie: TrackedMovie = {
            movieId: tmdbResult.id,
            movieTitle: item.title,
            posterPath: tmdbResult.posterPath,
            addedAt: item.created_at || new Date().toISOString(),
            watchedAt: item.is_watched ? (item.watched_at || new Date().toISOString()) : null,
            status: item.is_watched ? 'completed' : 'plan_to_watch',
          };
          newMovies.push(movie);
          result.movies++;
        }
      } else {
        // It's a TV show
        const existingShow = store.trackedShows.find(
          (s) => s.showId === tmdbResult.id
        );

        if (!existingShow) {
          // Build watched episodes array
          const watchedEpisodes: WatchedEpisode[] = [];

          if (item.seasons) {
            for (const season of item.seasons) {
              for (const episode of season.episodes) {
                if (episode.is_watched && !episode.special) {
                  watchedEpisodes.push({
                    showId: tmdbResult.id,
                    seasonNumber: season.number,
                    episodeNumber: episode.number,
                    episodeId: episode.id.tvdb, // Use TVDB ID as placeholder
                    watchedAt: episode.watched_at || new Date().toISOString(),
                  });
                }
              }
            }
          }

          const show: TrackedShow = {
            showId: tmdbResult.id,
            showName: item.title,
            posterPath: tmdbResult.posterPath,
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
    Alert.alert('Import Failed', 'Failed to import TV Time data. Please check the file format.');
    return result;
  }
}

export default { importFromTVTime };
