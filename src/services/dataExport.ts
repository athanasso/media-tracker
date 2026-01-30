/**
 * Data Export/Import Service
 * Allows users to backup and restore their watchlist data
 */

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackedBook, TrackedManga } from '@/src/types';

// Export file format
export interface ExportData {
  version: string;
  exportedAt: string;
  app: string;
  data: {
    trackedShows: TrackedShow[];
    trackedMovies: TrackedMovie[];
    trackedBooks?: TrackedBook[];
    trackedManga?: TrackedManga[];
  };
  stats: {
    totalShows: number;
    totalMovies: number;
    totalBooks?: number;
    totalManga?: number;
    totalWatchedEpisodes: number;
  };
}


const EXPORT_VERSION = '3.2.2';
const APP_NAME = 'MediaTracker';

/**
 * Generate export data object
 */
export function generateExportData(): ExportData {
  const { trackedShows, trackedMovies, trackedBooks, trackedManga } = useWatchlistStore.getState();

  // Calculate stats
  const totalWatchedEpisodes = trackedShows.reduce(
    (acc, show) => acc + show.watchedEpisodes.length,
    0
  );

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    app: APP_NAME,
    data: {
      trackedShows,
      trackedMovies,
      trackedBooks,
      trackedManga,
    },
    stats: {
      totalShows: trackedShows.length,
      totalMovies: trackedMovies.length,
      totalBooks: trackedBooks.length,
      totalManga: trackedManga.length,
      totalWatchedEpisodes,
    },
  };
}

/**
 * Export watchlist data to a JSON file
 */
export async function exportWatchlistData(): Promise<boolean> {
  try {
    const exportData = generateExportData();

    // Create filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Media-Tracker-backup-${dateStr}.json`;
    
    // Use new expo-file-system API
    const file = new File(Paths.cache, filename);
    file.write(JSON.stringify(exportData, null, 2));

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }

    // Share the file
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Watchlist Data',
      UTI: 'public.json',
    });

    return true;
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Export Failed', 'Failed to export watchlist data. Please try again.');
    return false;
  }
}

/**
 * Import watchlist data from a JSON file
 */
export async function importWatchlistData(): Promise<boolean> {
  try {
    // Pick a document
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return false;
    }

    const pickedFile = result.assets[0];

    // Read file content using new API
    const file = new File(pickedFile.uri);
    const content = await file.text();

    // Parse JSON
    const importedData: ExportData = JSON.parse(content);

    // Validate format
    if (!importedData.app || importedData.app !== APP_NAME) {
      Alert.alert(
        'Invalid File',
        'This file was not created by Media Tracker. Please select a valid backup file.'
      );
      return false;
    }

    if (!importedData.data?.trackedShows || !importedData.data?.trackedMovies) {
      Alert.alert('Invalid File', 'The backup file is corrupted or invalid.');
      return false;
    }

    // Show confirmation with stats
    const { trackedShows, trackedMovies, trackedBooks = [], trackedManga = [] } = importedData.data;

    return new Promise((resolve) => {
      Alert.alert(
        'Import Watchlist',
        `This backup contains:\n\n` +
          `• ${trackedShows.length} TV Shows\n` +
          `• ${trackedMovies.length} Movies\n` +
          (trackedBooks.length > 0 ? `• ${trackedBooks.length} Books\n` : '') +
          (trackedManga.length > 0 ? `• ${trackedManga.length} Manga\n` : '') +
          `• ${importedData.stats?.totalWatchedEpisodes || 0} Watched Episodes\n\n` +
          `Exported on: ${useSettingsStore.getState().getFormattedDate(importedData.exportedAt)}\n\n` +
          `Choose import mode:`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Merge',
            onPress: () => {
              mergeWatchlistData(trackedShows, trackedMovies, trackedBooks, trackedManga);
              Alert.alert('Success', 'Watchlist data merged successfully!');
              resolve(true);
            },
          },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: () => {
              replaceWatchlistData(trackedShows, trackedMovies, trackedBooks, trackedManga);
              Alert.alert('Success', 'Watchlist data imported successfully!');
              resolve(true);
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Import error:', error);
    Alert.alert('Import Failed', 'Failed to import watchlist data. Please check the file and try again.');
    return false;
  }
}

/**
 * Merge imported data with existing data (no duplicates)
 */
export function mergeWatchlistData(
  importedShows: TrackedShow[],
  importedMovies: TrackedMovie[],
  importedBooks: TrackedBook[],
  importedManga: TrackedManga[]
): void {
  const store = useWatchlistStore.getState();
  const { trackedShows, trackedMovies, trackedBooks, trackedManga } = store;

  // Merge shows (avoid duplicates based on showId)
  const existingShowIds = new Set(trackedShows.map((s) => s.showId));
  const newShows = importedShows.filter((s) => !existingShowIds.has(s.showId));

  // Merge movies (avoid duplicates based on movieId)
  const existingMovieIds = new Set(trackedMovies.map((m) => m.movieId));
  const newMovies = importedMovies.filter((m) => !existingMovieIds.has(m.movieId));

  // Merge books
  const existingBookIds = new Set(trackedBooks.map((b) => b.id));
  const newBooks = importedBooks.filter((b) => !existingBookIds.has(b.id));

  // Merge manga
  const existingMangaIds = new Set(trackedManga.map((m) => m.id));
  const newManga = importedManga.filter((m) => !existingMangaIds.has(m.id));

  // Update store
  useWatchlistStore.setState({
    trackedShows: [...trackedShows, ...newShows],
    trackedMovies: [...trackedMovies, ...newMovies],
    trackedBooks: [...trackedBooks, ...newBooks],
    trackedManga: [...trackedManga, ...newManga],
  });
}

/**
 * Replace all existing data with imported data
 */
export function replaceWatchlistData(
  importedShows: TrackedShow[],
  importedMovies: TrackedMovie[],
  importedBooks: TrackedBook[],
  importedManga: TrackedManga[]
): void {
  useWatchlistStore.setState({
    trackedShows: importedShows,
    trackedMovies: importedMovies,
    trackedBooks: importedBooks,
    trackedManga: importedManga,
  });
}

/**
 * Get export data preview (for UI display)
 */
export function getExportPreview(): {
  showCount: number;
  movieCount: number;
  bookCount: number;
  mangaCount: number;
  episodeCount: number;
} {
  const { trackedShows, trackedMovies, trackedBooks, trackedManga } = useWatchlistStore.getState();

  return {
    showCount: trackedShows.length,
    movieCount: trackedMovies.length,
    bookCount: trackedBooks.length,
    mangaCount: trackedManga.length,
    episodeCount: trackedShows.reduce(
      (acc, show) => acc + show.watchedEpisodes.length,
      0
    ),
  };
}

export default {
  exportWatchlistData,
  importWatchlistData,
  getExportPreview,
};
