import { mmkvStorage } from './storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    TrackedMovie,
    TrackedShow,
    TrackedBook,
    TrackedManga,
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
  trackedBooks: TrackedBook[];
  trackedManga: TrackedManga[];

  // Show Actions
  addShow: (show: Omit<TrackedShow, 'addedAt' | 'watchedEpisodes' | 'status'>) => void;
  removeShow: (showId: number) => void;
  updateShowStatus: (showId: number, status: TrackingStatus) => void;
  isShowTracked: (showId: number) => boolean;
  getTrackedShow: (showId: number) => TrackedShow | undefined;
  toggleShowFavorite: (showId: number) => void;
  updateShowDetails: (showId: number, updates: Partial<TrackedShow>) => void;

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
  updateMovieDetails: (movieId: number, updates: Partial<TrackedMovie>) => void;

  // Book Actions
  addBook: (book: Omit<TrackedBook, 'addedAt' | 'status'>) => void;
  removeBook: (bookId: string) => void;
  updateBookStatus: (bookId: string, status: TrackingStatus) => void;
  updateBookProgress: (bookId: string, currentPage: number) => void;
  isBookTracked: (bookId: string) => boolean;
  getTrackedBook: (bookId: string) => TrackedBook | undefined;
  toggleBookFavorite: (bookId: string) => void;

  // Manga Actions
  addManga: (manga: Omit<TrackedManga, 'addedAt' | 'status'>) => void;
  removeManga: (mangaId: number) => void;
  updateMangaStatus: (mangaId: number, status: TrackingStatus) => void;
  updateMangaProgress: (mangaId: number, currentChapter: number, currentVolume: number) => void;
  isMangaTracked: (mangaId: number) => boolean;
  getTrackedManga: (mangaId: number) => TrackedManga | undefined;
  toggleMangaFavorite: (mangaId: number) => void;

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
      trackedBooks: [],
      trackedManga: [],

      // ==========================================
      // SHOW ACTIONS
      // ==========================================
      // ... (existing code, untouched by this specific StartLine target if careful, but wait, I can target "trackedMovies: []," specifically)


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

      updateShowDetails: (showId, updates) => {
        set((state) => ({
          trackedShows: state.trackedShows.map((show) =>
            show.showId === showId ? { ...show, ...updates } : show
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
                  // If status is plan_to_watch or dropped, switch to watching.
                  status: (s.status === 'plan_to_watch' || s.status === 'dropped') ? 'watching' : s.status,
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
                  // If status is plan_to_watch or dropped, switch to watching.
                  status: (s.status === 'plan_to_watch' || s.status === 'dropped') ? 'watching' : s.status,
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

      updateMovieDetails: (movieId, updates) => {
        set((state) => ({
          trackedMovies: state.trackedMovies.map((movie) =>
            movie.movieId === movieId ? { ...movie, ...updates } : movie
          ),
        }));
      },

      // ==========================================
      // BOOK ACTIONS
      // ==========================================
      
      addBook: (book) => {
        const state = get();
        if (state.isBookTracked(book.id)) return;

        const newBook: TrackedBook = {
          ...book,
          addedAt: new Date().toISOString(),
          status: 'plan_to_watch',
        };

        set((state) => ({
          trackedBooks: [...state.trackedBooks, newBook],
        }));
      },

      removeBook: (bookId) => {
        set((state) => ({
          trackedBooks: state.trackedBooks.filter((b) => b.id !== bookId),
        }));
      },

      updateBookStatus: (bookId, status) => {
        set((state) => ({
          trackedBooks: state.trackedBooks.map((book) => {
             if (book.id !== bookId) return book;

             if (status === 'completed') {
                 return {
                     ...book,
                     status,
                     currentPage: book.totalPages || book.currentPage
                 };
             }
             return { ...book, status };
          }),
        }));
      },

      updateBookProgress: (bookId, currentPage) => {
        set((state) => ({
          trackedBooks: state.trackedBooks.map((book) =>
            book.id === bookId ? { ...book, currentPage } : book
          ),
        }));
      },

      isBookTracked: (bookId) => {
        return get().trackedBooks.some((b) => b.id === bookId);
      },

      getTrackedBook: (bookId) => {
        return get().trackedBooks.find((b) => b.id === bookId);
      },

      toggleBookFavorite: (bookId) => {
        set((state) => ({
          trackedBooks: state.trackedBooks.map((book) =>
            book.id === bookId ? { ...book, isFavorite: !book.isFavorite } : book
          ),
        }));
      },

      // ==========================================
      // MANGA ACTIONS
      // ==========================================

      addManga: (manga) => {
        const state = get();
        if (state.isMangaTracked(manga.id)) return;

        const newManga: TrackedManga = {
          ...manga,
          addedAt: new Date().toISOString(),
          status: 'plan_to_watch',
        };

        set((state) => ({
          trackedManga: [...state.trackedManga, newManga],
        }));
      },

      removeManga: (mangaId) => {
        set((state) => ({
          trackedManga: state.trackedManga.filter((m) => m.id !== mangaId),
        }));
      },

      updateMangaStatus: (mangaId, status) => {
        set((state) => ({
          trackedManga: state.trackedManga.map((manga) => {
            if (manga.id !== mangaId) return manga;
            
            // If marking as completed, auto-fill progress
            if (status === 'completed') {
                return {
                    ...manga,
                    status,
                    currentChapter: manga.totalChapters || manga.currentChapter,
                    currentVolume: manga.totalVolumes || manga.currentVolume
                };
            }
            
            return { ...manga, status };
          }),
        }));
      },

      updateMangaProgress: (mangaId, currentChapter, currentVolume) => {
        set((state) => ({
          trackedManga: state.trackedManga.map((manga) =>
            manga.id === mangaId ? { ...manga, currentChapter, currentVolume } : manga
          ),
        }));
      },

      isMangaTracked: (mangaId) => {
        return get().trackedManga.some((m) => m.id === mangaId);
      },

      getTrackedManga: (mangaId) => {
        return get().trackedManga.find((m) => m.id === mangaId);
      },

      toggleMangaFavorite: (mangaId) => {
        set((state) => ({
          trackedManga: state.trackedManga.map((manga) =>
            manga.id === mangaId ? { ...manga, isFavorite: !manga.isFavorite } : manga
          ),
        }));
      },

      // ==========================================
      // UTILITY ACTIONS
      // ==========================================

      clearWatchlist: () => {
        set({ trackedShows: [], trackedMovies: [], trackedBooks: [], trackedManga: [] });
      },
    }),
    {
      name: 'Media-Tracker-watchlist',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useWatchlistStore;
