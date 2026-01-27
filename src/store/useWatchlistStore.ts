/**
 * Watchlist Store (Zustand)
 * Global state management for tracking shows, movies, and watched episodes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    TrackedMovie,
    TrackedShow,
    TrackingStatus,
    WatchedEpisode,
} from '../types';

// ============================================
// STORE INTERFACE
// ============================================

interface WatchlistState {
  // Data
  trackedShows: TrackedShow[];
  trackedMovies: TrackedMovie[];

  // Show Actions
  addShow: (show: Omit<TrackedShow, 'addedAt' | 'watchedEpisodes' | 'status'>) => void;
  removeShow: (showId: number) => void;
  updateShowStatus: (showId: number, status: TrackingStatus) => void;
  isShowTracked: (showId: number) => boolean;
  getTrackedShow: (showId: number) => TrackedShow | undefined;
  toggleShowFavorite: (showId: number) => void;

  // Episode Actions
  markEpisodeWatched: (episode: Omit<WatchedEpisode, 'watchedAt'>) => void;
  markEpisodeUnwatched: (showId: number, seasonNumber: number, episodeNumber: number) => void;
  markSeasonWatched: (showId: number, seasonNumber: number, episodes: Omit<WatchedEpisode, 'watchedAt'>[]) => void;
  markSeasonUnwatched: (showId: number, seasonNumber: number) => void;
  markShowWatched: (showId: number, seasons: { seasonNumber: number; episodeCount: number }[]) => void;
  isEpisodeWatched: (showId: number, seasonNumber: number, episodeNumber: number) => boolean;
  getWatchedEpisodesCount: (showId: number) => number;
  getSeasonProgress: (showId: number, seasonNumber: number, totalEpisodes: number) => number;

  // Movie Actions
  addMovie: (movie: Omit<TrackedMovie, 'addedAt' | 'watchedAt' | 'status'>) => void;
  removeMovie: (movieId: number) => void;
  markMovieWatched: (movieId: number) => void;
  markMovieUnwatched: (movieId: number) => void;
  updateMovieStatus: (movieId: number, status: TrackingStatus) => void;
  isMovieTracked: (movieId: number) => boolean;
  isMovieWatched: (movieId: number) => boolean;
  getTrackedMovie: (movieId: number) => TrackedMovie | undefined;
  toggleMovieFavorite: (movieId: number) => void;

  // Utility Actions
  clearWatchlist: () => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      // Initial state
      trackedShows: [],
      trackedMovies: [],

      // ==========================================
      // SHOW ACTIONS
      // ==========================================

      addShow: (show) => {
        const state = get();
        if (state.isShowTracked(show.showId)) return;

        const newShow: TrackedShow = {
          ...show,
          addedAt: new Date().toISOString(),
          watchedEpisodes: [],
          status: 'plan_to_watch',
        };

        set((state) => ({
          trackedShows: [...state.trackedShows, newShow],
        }));
      },

      removeShow: (showId) => {
        set((state) => ({
          trackedShows: state.trackedShows.filter((s) => s.showId !== showId),
        }));
      },

      updateShowStatus: (showId, status) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) =>
            show.showId === showId ? { ...show, status } : show
          ),
        }));
      },

      isShowTracked: (showId) => {
        return get().trackedShows.some((s) => s.showId === showId);
      },

      getTrackedShow: (showId) => {
        return get().trackedShows.find((s) => s.showId === showId);
      },

      toggleShowFavorite: (showId) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) =>
            show.showId === showId ? { ...show, isFavorite: !show.isFavorite } : show
          ),
        }));
      },

      // ==========================================
      // EPISODE ACTIONS
      // ==========================================

      markEpisodeWatched: (episode) => {
        const state = get();
        const show = state.trackedShows.find((s) => s.showId === episode.showId);

        if (!show) return;

        // Check if already watched
        const alreadyWatched = show.watchedEpisodes.some(
          (e) =>
            e.seasonNumber === episode.seasonNumber &&
            e.episodeNumber === episode.episodeNumber
        );

        if (alreadyWatched) return;

        const newWatchedEpisode: WatchedEpisode = {
          ...episode,
          watchedAt: new Date().toISOString(),
        };

        set((state) => ({
          trackedShows: state.trackedShows.map((s) =>
            s.showId === episode.showId
              ? {
                  ...s,
                  watchedEpisodes: [...s.watchedEpisodes, newWatchedEpisode],
                  status: s.status === 'plan_to_watch' ? 'watching' : s.status,
                }
              : s
          ),
        }));
      },

      markEpisodeUnwatched: (showId, seasonNumber, episodeNumber) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) => {
            if (show.showId !== showId) return show;

            const newWatchedEpisodes = show.watchedEpisodes.filter(
              (e) =>
                !(
                  e.seasonNumber === seasonNumber &&
                  e.episodeNumber === episodeNumber
                )
            );

            let newStatus = show.status;
            if (newWatchedEpisodes.length === 0) {
              newStatus = 'plan_to_watch';
            } else if (show.status === 'completed') {
              newStatus = 'watching';
            }

            return {
              ...show,
              watchedEpisodes: newWatchedEpisodes,
              status: newStatus,
            };
          }),
        }));
      },

      markSeasonWatched: (showId, seasonNumber, episodes) => {
        const state = get();
        const show = state.trackedShows.find((s) => s.showId === showId);

        if (!show) return;

        // Filter out already watched episodes
        const newEpisodes = episodes.filter(
          (ep) =>
            !show.watchedEpisodes.some(
              (we) =>
                we.seasonNumber === ep.seasonNumber &&
                we.episodeNumber === ep.episodeNumber
            )
        );

        const watchedEpisodes: WatchedEpisode[] = newEpisodes.map((ep) => ({
          ...ep,
          watchedAt: new Date().toISOString(),
        }));

        set((state) => ({
          trackedShows: state.trackedShows.map((s) =>
            s.showId === showId
              ? {
                  ...s,
                  watchedEpisodes: [...s.watchedEpisodes, ...watchedEpisodes],
                  status: s.status === 'plan_to_watch' ? 'watching' : s.status,
                }
              : s
          ),
        }));
      },

      markSeasonUnwatched: (showId, seasonNumber) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) => {
            if (show.showId !== showId) return show;

            const newWatchedEpisodes = show.watchedEpisodes.filter(
              (e) => e.seasonNumber !== seasonNumber
            );

            let newStatus = show.status;
            if (newWatchedEpisodes.length === 0) {
              newStatus = 'plan_to_watch';
            } else if (show.status === 'completed') {
              newStatus = 'watching';
            }

            return {
              ...show,
              watchedEpisodes: newWatchedEpisodes,
              status: newStatus,
            };
          }),
        }));
      },

      markShowWatched: (showId, seasons) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) => {
            if (show.showId !== showId) return show;

            // Generate all episodes
            const allEpisodes: WatchedEpisode[] = [];
            const timestamp = new Date().toISOString();

            seasons.forEach((season) => {
              for (let i = 1; i <= season.episodeCount; i++) {
                allEpisodes.push({
                  showId,
                  seasonNumber: season.seasonNumber,
                  episodeNumber: i,
                  episodeId: -1, // Dummy ID as we don't fetch all details
                  watchedAt: timestamp,
                });
              }
            });

            return {
              ...show,
              watchedEpisodes: allEpisodes,
              status: 'completed',
            };
          }),
        }));
      },

      isEpisodeWatched: (showId, seasonNumber, episodeNumber) => {
        const show = get().trackedShows.find((s) => s.showId === showId);
        if (!show) return false;

        return show.watchedEpisodes.some(
          (e) =>
            e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber
        );
      },

      getWatchedEpisodesCount: (showId) => {
        const show = get().trackedShows.find((s) => s.showId === showId);
        return show?.watchedEpisodes.length ?? 0;
      },

      getSeasonProgress: (showId, seasonNumber, totalEpisodes) => {
        const show = get().trackedShows.find((s) => s.showId === showId);
        if (!show || totalEpisodes === 0) return 0;

        const watchedInSeason = show.watchedEpisodes.filter(
          (e) => e.seasonNumber === seasonNumber
        ).length;

        return Math.round((watchedInSeason / totalEpisodes) * 100);
      },

      // ==========================================
      // MOVIE ACTIONS
      // ==========================================

      addMovie: (movie) => {
        const state = get();
        if (state.isMovieTracked(movie.movieId)) return;

        const newMovie: TrackedMovie = {
          ...movie,
          addedAt: new Date().toISOString(),
          watchedAt: null,
          status: 'plan_to_watch',
        };

        set((state) => ({
          trackedMovies: [...state.trackedMovies, newMovie],
        }));
      },

      removeMovie: (movieId) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.filter((m) => m.movieId !== movieId),
        }));
      },

      markMovieWatched: (movieId) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.map((movie) =>
            movie.movieId === movieId
              ? {
                  ...movie,
                  watchedAt: new Date().toISOString(),
                  status: 'completed' as TrackingStatus,
                }
              : movie
          ),
        }));
      },

      markMovieUnwatched: (movieId) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.map((movie) =>
            movie.movieId === movieId
              ? {
                  ...movie,
                  watchedAt: null,
                  status: 'plan_to_watch' as TrackingStatus,
                }
              : movie
          ),
        }));
      },

      updateMovieStatus: (movieId, status) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.map((movie) =>
            movie.movieId === movieId ? { ...movie, status } : movie
          ),
        }));
      },

      isMovieTracked: (movieId) => {
        return get().trackedMovies.some((m) => m.movieId === movieId);
      },

      isMovieWatched: (movieId) => {
        const movie = get().trackedMovies.find((m) => m.movieId === movieId);
        return movie?.watchedAt !== null;
      },

      getTrackedMovie: (movieId) => {
        return get().trackedMovies.find((m) => m.movieId === movieId);
      },

      toggleMovieFavorite: (movieId) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.map((movie) =>
            movie.movieId === movieId ? { ...movie, isFavorite: !movie.isFavorite } : movie
          ),
        }));
      },

      // ==========================================
      // UTILITY ACTIONS
      // ==========================================

      clearWatchlist: () => {
        set({ trackedShows: [], trackedMovies: [] });
      },
    }),
    {
      name: 'Media-Tracker-watchlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useWatchlistStore;
