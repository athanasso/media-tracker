/**
 * Profile Screen - Watchlist Management
 */

import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { useNotificationStore, useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackedBook, TrackedManga, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookItem from '../components/BookItem';
import MangaItem from '../components/MangaItem';
import MovieItem from '../components/MovieItem';
import ShowItem from '../components/ShowItem';
import UpcomingShowItem from '../components/UpcomingShowItem';
import { strings } from '@/src/i18n/strings';

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
};

type SortOption = 'name' | 'date' | 'status' | 'added';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'shows' | 'movies' | 'books' | 'manga' | 'plan' | 'favorites'>('shows');
  const [showsSubTab, setShowsSubTab] = useState<'watched' | 'in_progress' | 'upcoming' | 'dropped'>('watched');
  const [moviesSubTab, setMoviesSubTab] = useState<'watched' | 'upcoming'>('watched');
  const [booksSubTab, setBooksSubTab] = useState<'read' | 'reading' | 'plan_to_read' | 'dropped'>('reading');
  const [mangaSubTab, setMangaSubTab] = useState<'read' | 'reading' | 'plan_to_read' | 'dropped'>('reading');

  const [planSubTab, setPlanSubTab] = useState<'shows' | 'movies' | 'books' | 'manga' | 'all'>('all');
  const [favoritesSubTab, setFavoritesSubTab] = useState<'shows' | 'movies' | 'books' | 'manga' | 'all'>('all');
  
  // Search and sort states
  const [showsSearch, setShowsSearch] = useState('');
  const [moviesSearch, setMoviesSearch] = useState('');
  const [booksSearch, setBooksSearch] = useState('');
  const [mangaSearch, setMangaSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [favoritesSearch, setFavoritesSearch] = useState('');
  
  const [showsSort, setShowsSort] = useState<SortOption>('added');
  const [moviesSort, setMoviesSort] = useState<SortOption>('added');
  const [booksSort, setBooksSort] = useState<SortOption>('added');
  const [mangaSort, setMangaSort] = useState<SortOption>('added');
  const [planSort, setPlanSort] = useState<SortOption>('added');
  const [favoritesSort, setFavoritesSort] = useState<SortOption>('added');
  const [showSortMenu, setShowSortMenu] = useState<'shows' | 'movies' | 'books' | 'manga' | 'plan' | 'favorites' | null>(null);

  const { 
    trackedShows, trackedMovies, trackedBooks, trackedManga,
    removeShow, removeMovie, removeBook, removeManga,
    getWatchedEpisodesCount, updateShowStatus, updateMovieStatus, updateBookStatus, updateBookProgress, updateMangaStatus, updateMangaProgress,
    markEpisodeWatched, updateShowDetails, updateMovieDetails, bulkUpdateShowStatus
  } = useWatchlistStore();
  const { 
    addNotification, 
    removeNotification, 
    hasNotification, 
    getNotificationPreference 
  } = useNotificationStore();
  const { getFormattedDate, language, showBooks, showManga, showFavorites } = useSettingsStore();

  const { showDroppedTab } = useSettingsStore();
  const t = strings[language] || strings.en;

  // If dropped tab is hidden but selected, switch to in_progress
  useEffect(() => {
    if (!showDroppedTab && showsSubTab === 'dropped') {
      setShowsSubTab('in_progress');
    }
    if (!showFavorites && activeTab === 'favorites') {
      setActiveTab('shows');
    }
  }, [showDroppedTab, showsSubTab, showFavorites, activeTab]);

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t.notificationPermission,
          t.notificationPermissionMsg
        );
      }
    })();
  }, []);

  // Get plan to watch items
  const planToWatchShows = useMemo(() => trackedShows.filter(s => s.status === 'plan_to_watch'), [trackedShows]);
  const planToWatchMovies = useMemo(() => trackedMovies.filter(m => m.status === 'plan_to_watch'), [trackedMovies]);

  // Get favorite items
  const favoriteShows = useMemo(() => trackedShows.filter(s => s.isFavorite), [trackedShows]);
  const favoriteMovies = useMemo(() => trackedMovies.filter(m => m.isFavorite), [trackedMovies]);

  const totalWatchedEpisodes = useMemo(() => 
    trackedShows.reduce((acc, show) => acc + show.watchedEpisodes.length, 0),
    [trackedShows]
  );

  // Fetch details for shows to determine status and air dates
  // We need details for 'watching' (to check progress), 'plan_to_watch' (for upcoming), and 'completed' (for returning series upcoming)
  const showsToFetchDetails = useMemo(() => 
    trackedShows.filter(s => ['plan_to_watch', 'watching', 'completed'].includes(s.status)), 
    [trackedShows]
  );
  
  const upcomingMovieIds = useMemo(() => 
    moviesSubTab === 'upcoming' ? planToWatchMovies.map(m => m.movieId) : [],
    [moviesSubTab, planToWatchMovies]
  );

  // Fetch show details
  const showDetailsQueriesResult = useQueries({
    queries: showsToFetchDetails.map(show => ({
      queryKey: ['show-details', show.showId, 'minimal'],
      queryFn: () => getShowDetails(show.showId, []),
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60, // 1 hour
      enabled: activeTab === 'shows', // Fetch whenever on Shows tab to sort into Watched/In Progress
    }))
  });

  const showDetailsQueries = useMemo(() => ({
    data: showDetailsQueriesResult.map(q => q.data).filter(Boolean) as Awaited<ReturnType<typeof getShowDetails>>[],
    isLoading: showDetailsQueriesResult.some(q => q.isLoading && q.fetchStatus !== 'idle'),
  }), [showDetailsQueriesResult]);

  // Fetch movie details for upcoming movies using useQueries
  const movieDetailsQueriesResult = useQueries({
    queries: upcomingMovieIds.map(id => ({
      queryKey: ['movie-details', id, 'minimal'],
      queryFn: () => getMovieDetails(id, []),
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60, // 1 hour
      enabled: moviesSubTab === 'upcoming',
    }))
  });

  const movieDetailsQueries = useMemo(() => ({
    data: movieDetailsQueriesResult.map(q => q.data).filter(Boolean) as Awaited<ReturnType<typeof getMovieDetails>>[],
    isLoading: movieDetailsQueriesResult.some(q => q.isLoading && q.fetchStatus !== 'idle'),
  }), [movieDetailsQueriesResult]);

  /* Update Store with Cached Dates for Calendar Optimization */
  useEffect(() => {
    if (!showDetailsQueries.data) return;
    
    showDetailsQueries.data.forEach(details => {
        const nextAirDate = details.next_episode_to_air?.air_date || null;
        const currentShow = trackedShows.find(s => s.showId === details.id);
        
        // Only update if changed to avoid infinite loop (check string equality)
        if (currentShow && currentShow.nextAirDate !== nextAirDate) {
            // Use setTimeout to avoid "update during render" warning if this triggers synchronously
            setTimeout(() => {
                updateShowDetails(details.id, { nextAirDate });
            }, 0);
        }
    });
  }, [showDetailsQueries.data, trackedShows, updateShowDetails]);

  useEffect(() => {
      if (!movieDetailsQueries.data) return;
      
      movieDetailsQueries.data.forEach(details => {
          const releaseDate = details.release_date || null;
          const currentMovie = trackedMovies.find(m => m.movieId === details.id);
          
          if (currentMovie && currentMovie.releaseDate !== releaseDate) {
              setTimeout(() => {
                   updateMovieDetails(details.id, { releaseDate });
              }, 0);
          }
      });
  }, [movieDetailsQueries.data, trackedMovies, updateMovieDetails]);

  const getStatusColor = (status: TrackingStatus) => {
    const colors: Record<TrackingStatus, string> = {
      watching: '#22c55e', completed: '#3b82f6', plan_to_watch: '#f59e0b',
      on_hold: '#8b5cf6', dropped: '#ef4444',
    };
    return colors[status] || Colors.textSecondary;
  };

  const handleStatusChange = (id: number | string, type: 'show' | 'movie' | 'book' | 'manga', currentStatus: TrackingStatus) => {
    const statusOptions: TrackingStatus[] = ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'];

    Alert.alert(
      t.changeStatus,
      t.selectStatus,
      [
        ...statusOptions.map(status => {
          let label = '';
          switch (status) {
            case 'watching': label = type === 'book' || type === 'manga' ? t.reading : t.statusWatching; break;
            case 'completed': label = type === 'book' || type === 'manga' ? t.read : t.statusCompleted; break;
            case 'plan_to_watch': label = type === 'book' || type === 'manga' ? t.planToRead : t.statusPlanToWatch; break;
            case 'on_hold': label = t.statusOnHold; break;
            case 'dropped': label = t.statusDropped; break;
          }
          
          return {
            text: label,
            onPress: () => {
              if (type === 'show') updateShowStatus(id as number, status);
              else if (type === 'movie') updateMovieStatus(id as number, status);
              else if (type === 'book') updateBookStatus(id as string, status);
              else if (type === 'manga') updateMangaStatus(id as number, status);
            },
            style: status === currentStatus ? 'cancel' : 'default' as any,
          };
        }),
        { text: t.cancel, style: 'cancel' as any },
      ],
      { cancelable: true }
    );
  };

  const handleNotificationPress = async (
    id: number,
    type: 'show' | 'movie',
    name: string,
    airDate: string
  ) => {
    const hasNotif = hasNotification(id, type);
    const currentPref = getNotificationPreference(id, type);

    if (hasNotif) {
      // Show options to change timing or remove
      Alert.alert(
        t.notificationSettings,
        t.notificationSetFor.replace('{name}', name),
        [
          {
            text: t.changeTiming,
            onPress: () => showTimingSelector(id, type, name, airDate, currentPref?.timing || '1 day'),
          },
          {
            text: t.removeNotification,
            style: 'destructive' as any,
            onPress: async () => {
              await removeNotification(id, type);
              Alert.alert(t.notificationRemoved, t.notificationRemovedMsg);
            },
          },
          { text: t.cancel, style: 'cancel' as any },
        ],
        { cancelable: true }
      );
    } else {
      // Show timing selector to add notification
      showTimingSelector(id, type, name, airDate);
    }
  };

  const showTimingSelector = (
    id: number,
    type: 'show' | 'movie',
    name: string,
    airDate: string,
    currentTiming?: string
  ) => {
    const timingOptions: { label: string; value: import('@/src/store/useNotificationStore').NotificationTiming }[] = [
      { label: `1 ${language === 'el' ? 'μέρα' : 'day'} ${t.before}`, value: '1 day' },
      { label: `3 ${language === 'el' ? 'μέρες' : 'days'} ${t.before}`, value: '3 days' },
      { label: `1 ${language === 'el' ? 'εβδομάδα' : 'week'} ${t.before}`, value: '1 week' },
    ];

    Alert.alert(
      t.setNotification,
      t.notifyWhen.replace('{name}', name),
      [
        ...timingOptions.map(option => ({
          text: option.label,
          onPress: async () => {
            try {
              await addNotification({
                id,
                type,
                name,
                airDate,
                timing: option.value,
              });
              Alert.alert(
                t.notificationSet,
                t.notifyMsg.replace('{timing}', option.label.toLowerCase())
              );
            } catch {
              Alert.alert(t.error, t.failedToSetNotif);
            }
          },
          style: currentTiming === option.value ? 'default' : 'default' as any,
        })),
        { text: t.cancel, style: 'cancel' as any },
      ],
      { cancelable: true }
    );
  };

  // Filter and sort functions
  const filterAndSort = <T extends TrackedShow | TrackedMovie | TrackedBook | TrackedManga>(
    items: T[],
    search: string,
    sort: SortOption,
    getTitle: (item: T) => string
  ): T[] => {
    let filtered = items;

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => getTitle(item).toLowerCase().includes(searchLower));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return getTitle(a).localeCompare(getTitle(b));
        case 'date': // Air Date / Release Date
          const getAirReleaseDate = (item: T) => {
              if ('airDate' in item && typeof item.airDate === 'string') return item.airDate; // Custom prop from hooks
              if ('releaseDate' in item && typeof item.releaseDate === 'string') return item.releaseDate; // Custom prop
              // Fallback to addedAt if no air date available
              return item.addedAt;
          };
          return new Date(getAirReleaseDate(b)).getTime() - new Date(getAirReleaseDate(a)).getTime();

        case 'status':
          return a.status.localeCompare(b.status);

        case 'added': // Last Watched Date
           const getLastWatched = (item: T) => {
               // Shows: check recent episode
               if ('watchedEpisodes' in item && Array.isArray(item.watchedEpisodes) && item.watchedEpisodes.length > 0) {
                   // Sort to find max (most recent)
                   const sorted = [...item.watchedEpisodes].sort((x, y) => new Date(y.watchedAt).getTime() - new Date(x.watchedAt).getTime());
                   return sorted[0].watchedAt;
               }
               // Movies: if we tracked watchedAt (future feature?), else fallback to addedAt
               if ('watchedAt' in item && typeof item.watchedAt === 'string') return item.watchedAt;
               
               return item.addedAt;
           };
           return new Date(getLastWatched(b)).getTime() - new Date(getLastWatched(a)).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  };

  // Auto-update status for Returning Series that have new episodes
  useEffect(() => {
    if (!showDetailsQueries.data) return;
    
    const updates: { showId: number; status: 'watching' }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    showDetailsQueries.data.forEach(details => {
         const show = trackedShows.find(s => s.showId === details.id);
         if (!show || show.status !== 'completed') return;
         
         // Check if new episodes are available
         const lastEpisode = details.last_episode_to_air;
         if (!lastEpisode) return;
         
         let hasUnwatched = false;
         
         // Check if we watched the last officially aired episode
         const watchedLast = show.watchedEpisodes.some(
            e => e.seasonNumber === lastEpisode.season_number && e.episodeNumber === lastEpisode.episode_number
         );
         
         if (!watchedLast) {
             hasUnwatched = true;
         } else {
             // Check next episode if it has newly aired
             const nextEpisode = details.next_episode_to_air;
             if (nextEpisode && nextEpisode.air_date && nextEpisode.air_date <= todayStr) {
                 const watchedNext = show.watchedEpisodes.some(
                    e => e.seasonNumber === nextEpisode.season_number && e.episodeNumber === nextEpisode.episode_number
                 );
                 if (!watchedNext) hasUnwatched = true;
             }
         }
         
         if (hasUnwatched) {
             updates.push({ showId: show.showId, status: 'watching' });
         }
    });

    if (updates.length > 0) {
        bulkUpdateShowStatus(updates);
    }
  }, [showDetailsQueries.data, trackedShows, bulkUpdateShowStatus]);

  // Get filtered and sorted shows
  const filteredShows = useMemo(() => {
    let shows: (TrackedShow & { 
        airDate?: string; 
        nextEpisode?: { seasonNumber: number; episodeNumber: number };
        remainingEpisodes?: number;
        numberOfEpisodes?: number;
        seasons?: { seasonNumber: number; episodeCount: number }[];
    })[] = [];
    const showDetailsMap = new Map(
      (showDetailsQueries.data || []).map(show => [show.id, show])
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCaughtUp = (show: TrackedShow) => {
        const details = showDetailsMap.get(show.showId);
        if (show.status === 'completed') return true;
        // If details are loading, assume caught up to avoid "In Progress" clutter
        if (!details) return true;
        
        const lastEpisode = details.last_episode_to_air;
        if (!lastEpisode) return true;
        if (!lastEpisode) return true; // No episodes aired yet?

        // Check "next" episode: if cached data says "next" is yesterday/today, it's actually released
        const nextEpisode = details.next_episode_to_air;
        if (nextEpisode && nextEpisode.air_date) {
            const todayStr = new Date().toISOString().split('T')[0];
            
            // If "next" episode has already aired (or airs today)
            // String comparison works for ISO dates: "2024-05-20" <= "2024-05-21"
            if (nextEpisode.air_date <= todayStr) {
                const watchedNext = show.watchedEpisodes.some(
                    e => e.seasonNumber === nextEpisode.season_number && e.episodeNumber === nextEpisode.episode_number
                );
                if (!watchedNext) return false; // Available but not watched
            }
        }

        // Check if we watched the last officially aired episode
        return show.watchedEpisodes.some(
            e => e.seasonNumber === lastEpisode.season_number && e.episodeNumber === lastEpisode.episode_number
        );
    };

    if (showsSubTab === 'watched') {
      shows = trackedShows.filter(s => {
          if (s.status === 'completed') {
              return isCaughtUp(s);
          }
          if (s.status === 'watching') {
              return isCaughtUp(s);
          }
          return false;
      }).map(show => {
        const details = showDetailsMap.get(show.showId);
        return {
            ...show,
            numberOfEpisodes: details?.number_of_episodes,
            seasons: details?.seasons?.map(s => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
        };
      });
    } else if (showsSubTab === 'in_progress') {
      shows = trackedShows
        .filter(s => {
          if (s.status === 'watching') {
              return !isCaughtUp(s);
          }
          if (s.status === 'completed') {
              return !isCaughtUp(s);
          }
          return false;
        })
        .map(show => {
            const details = showDetailsMap.get(show.showId);
            if (!details) return show;

            let totalEpisodes = 0;
            let remainingEpisodes = 0;
            let nextEpisode: { seasonNumber: number; episodeNumber: number; seasonName?: string } | undefined;
            
            // Calculate total and find next episode
            if (details.seasons) {
                // Sort seasons just in case
                const sortedSeasons = [...details.seasons]
                    .filter(s => s.season_number > 0) // Skip specials usually? Or keep them? Let's skip specials for "next" calculation for now unless watched
                    .sort((a, b) => a.season_number - b.season_number);

                // Calculate total AIRED episodes based on last_episode_to_air
                const lastAir = details.last_episode_to_air;
                if (lastAir) {
                    for (const season of sortedSeasons) {
                         if (season.season_number < lastAir.season_number) {
                            totalEpisodes += season.episode_count;
                         } else if (season.season_number === lastAir.season_number) {
                            // Ensure we don't exceed season count if API data is weird, but usually lastAir.episode_number is auth
                            totalEpisodes += Math.min(season.episode_count, lastAir.episode_number);
                         }
                    }
                } else if (details.status === 'Ended' || details.status === 'Canceled') {
                     // If ended but lastAir missing (rare), assume all aired
                     for (const season of sortedSeasons) totalEpisodes += season.episode_count;
                }

                for (const season of sortedSeasons) {
                    // totalEpisodes calculation moved to aired-logic above
                    
                    if (!nextEpisode) {
                        for (let i = 1; i <= season.episode_count; i++) {
                            const isWatched = show.watchedEpisodes.some(
                                e => e.seasonNumber === season.season_number && e.episodeNumber === i
                            );
                            if (!isWatched) {
                                nextEpisode = {
                                    seasonNumber: season.season_number,
                                    episodeNumber: i,
                                    seasonName: season.name
                                };
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback: Check if "next_episode_to_air" is actually a released episode that we missed 
            //String comparison optimization
            const apiNextEp = details.next_episode_to_air;
            if (apiNextEp && apiNextEp.air_date) {
                const todayStr = new Date().toISOString().split('T')[0];
                
                // If it aired in the past OR today
                if (apiNextEp.air_date <= todayStr) {
                    // Update total count to include this newly aired episode
                     totalEpisodes++;

                    const isWatched = show.watchedEpisodes.some(
                        e => e.seasonNumber === apiNextEp.season_number && e.episodeNumber === apiNextEp.episode_number
                    );
                    
                    if (!isWatched && !nextEpisode) {
                        const season = details.seasons?.find(s => s.season_number === apiNextEp.season_number);
                        nextEpisode = {
                            seasonNumber: apiNextEp.season_number,
                            episodeNumber: apiNextEp.episode_number,
                            seasonName: season?.name
                        };
                    }
                }
            }

            // Calculate remaining episodes (Total Regular - Watched Regular)
            const watchedRegularCount = show.watchedEpisodes.filter(e => e.seasonNumber > 0).length;
            remainingEpisodes = Math.max(0, totalEpisodes - watchedRegularCount);

            // If we have a next episode to watch, but math says 0 remaining (due to stale totalEpisodes), force at least 1
            if (nextEpisode && remainingEpisodes === 0) {
                remainingEpisodes = 1;
            }

            return {
                ...show,
                nextEpisode,
                remainingEpisodes,
                numberOfEpisodes: details.number_of_episodes,
                seasons: details.seasons?.map(s => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
            };
        });
    } else if (showsSubTab === 'upcoming') {
      shows = showsToFetchDetails
        .map(show => {
          const details = showDetailsMap.get(show.showId);
          if (!details) return null;
          
          const airDate = details.next_episode_to_air?.air_date;
          if (!airDate) return null;
          
          const airDateObj = new Date(airDate);
          airDateObj.setHours(0, 0, 0, 0);
          
          if (airDateObj >= today) {
            return { ...show, airDate, next_episode_to_air: details.next_episode_to_air };
          }
          return null;
        })
        .filter((show): show is TrackedShow & { airDate: string; next_episode_to_air: any } => show !== null);
    } else if (showsSubTab === 'dropped') {
      shows = trackedShows.filter(s => s.status === 'dropped').map(show => {
        const details = showDetailsMap.get(show.showId);
        return {
            ...show,
            numberOfEpisodes: details?.number_of_episodes,
            seasons: details?.seasons?.map(s => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
        };
      });
    }

    return filterAndSort(shows, showsSearch, showsSort, (s) => s.showName);
  }, [trackedShows, showsSubTab, showDetailsQueries.data, showsToFetchDetails, showsSearch, showsSort]);

  // Get filtered and sorted movies
  const filteredMovies = useMemo(() => {
    let movies: TrackedMovie[] = [];

    if (moviesSubTab === 'watched') {
      movies = trackedMovies.filter(m => m.status === 'completed' || m.status === 'watching');
    } else if (moviesSubTab === 'upcoming') {
      const movieDetailsMap = new Map(
        (movieDetailsQueries.data || []).map(movie => [movie.id, movie])
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      movies = planToWatchMovies
        .map(movie => {
          const details = movieDetailsMap.get(movie.movieId);
          if (!details) return null;
          
          const releaseDate = details.release_date;
          if (!releaseDate) return null;
          
          const releaseDateObj = new Date(releaseDate);
          releaseDateObj.setHours(0, 0, 0, 0);
          
          if (releaseDateObj >= today) {
            return { ...movie, releaseDate };
          }
          return null;
        })
        .filter((movie): movie is TrackedMovie & { releaseDate: string } => movie !== null);
    }

    return filterAndSort(movies, moviesSearch, moviesSort, (m) => m.movieTitle);
  }, [trackedMovies, moviesSubTab, movieDetailsQueries.data, planToWatchMovies, moviesSearch, moviesSort]);

  // Get filtered and sorted books
  const filteredBooks = useMemo(() => {
    let books: TrackedBook[] = [];

    if (booksSubTab === 'reading') {
      books = trackedBooks.filter(b => b.status === 'watching'); // Reuse 'watching' as 'reading'
    } else if (booksSubTab === 'read') {
      books = trackedBooks.filter(b => b.status === 'completed');
    } else if (booksSubTab === 'plan_to_read') {
      books = trackedBooks.filter(b => b.status === 'plan_to_watch');
    } else if (booksSubTab === 'dropped') {
      books = trackedBooks.filter(b => b.status === 'dropped');
    }

    return filterAndSort(books, booksSearch, booksSort, (b) => b.title);
  }, [trackedBooks, booksSubTab, booksSearch, booksSort]);

  // Get filtered and sorted manga
  const filteredManga = useMemo(() => {
    let manga: TrackedManga[] = [];

    if (mangaSubTab === 'reading') {
      manga = trackedManga.filter(m => m.status === 'watching'); // Reuse 'watching' as 'reading'
    } else if (mangaSubTab === 'read') {
      manga = trackedManga.filter(m => m.status === 'completed');
    } else if (mangaSubTab === 'plan_to_read') {
      manga = trackedManga.filter(m => m.status === 'plan_to_watch');
    } else if (mangaSubTab === 'dropped') {
      manga = trackedManga.filter(m => m.status === 'dropped');
    }

    return filterAndSort(manga, mangaSearch, mangaSort, (m) => m.title);
  }, [trackedManga, mangaSubTab, mangaSearch, mangaSort]);

  // Get filtered and sorted plan to watch items
  const filteredPlanItems = useMemo(() => {
    type PlanItem = (TrackedShow & { type: 'show' }) | (TrackedMovie & { type: 'movie' }) | (TrackedBook & { type: 'book' }) | (TrackedManga & { type: 'manga' });
    let items: PlanItem[] = [];

    const planShows = trackedShows.filter(s => s.status === 'plan_to_watch');
    const planMovies = trackedMovies.filter(m => m.status === 'plan_to_watch');
    const planBooks = trackedBooks.filter(b => b.status === 'plan_to_watch');
    const planManga = trackedManga.filter(m => m.status === 'plan_to_watch');

    if (planSubTab === 'shows') {
      items = planShows.map(s => ({ ...s, type: 'show' as const }));
    } else if (planSubTab === 'movies') {
      items = planMovies.map(m => ({ ...m, type: 'movie' as const }));
    } else if (planSubTab === 'books') {
      items = planBooks.map(b => ({ ...b, type: 'book' as const }));
    } else if (planSubTab === 'manga') {
      items = planManga.map(m => ({ ...m, type: 'manga' as const }));
    } else {
      items = [
        ...planShows.map(s => ({ ...s, type: 'show' as const })),
        ...planMovies.map(m => ({ ...m, type: 'movie' as const })),
        ...planBooks.map(b => ({ ...b, type: 'book' as const })),
        ...planManga.map(m => ({ ...m, type: 'manga' as const }))
      ];
    }

    // Filter by search
    if (planSearch.trim()) {
      const searchLower = planSearch.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'show') return item.showName.toLowerCase().includes(searchLower);
        if (item.type === 'movie') return item.movieTitle.toLowerCase().includes(searchLower);
        if (item.type === 'book') return item.title.toLowerCase().includes(searchLower);
        if (item.type === 'manga') return item.title.toLowerCase().includes(searchLower);
        return false;
      });
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      const getTitle = (item: typeof items[0]) => {
         if (item.type === 'show') return item.showName;
         if (item.type === 'movie') return item.movieTitle;
         return item.title;
      };

      switch (planSort) {
        case 'name':
          return getTitle(a).localeCompare(getTitle(b));
        case 'date':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'added':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [trackedShows, trackedMovies, trackedBooks, trackedManga, planSubTab, planSearch, planSort]);

  // Get filtered and sorted favorite items
  const filteredFavorites = useMemo(() => {
    type FavoriteItem = (TrackedShow & { type: 'show' }) | (TrackedMovie & { type: 'movie' }) | (TrackedBook & { type: 'book' }) | (TrackedManga & { type: 'manga' });
    let items: FavoriteItem[] = [];

    const favShows = trackedShows.filter(s => s.isFavorite);
    const favMovies = trackedMovies.filter(m => m.isFavorite);
    const favBooks = trackedBooks.filter(b => b.isFavorite);
    const favManga = trackedManga.filter(m => m.isFavorite);

    if (favoritesSubTab === 'shows') {
      items = favShows.map(s => ({ ...s, type: 'show' as const }));
    } else if (favoritesSubTab === 'movies') {
      items = favMovies.map(m => ({ ...m, type: 'movie' as const }));
    } else if (favoritesSubTab === 'books') {
      items = favBooks.map(b => ({ ...b, type: 'book' as const }));
    } else if (favoritesSubTab === 'manga') {
      items = favManga.map(m => ({ ...m, type: 'manga' as const }));
    } else {
      items = [
        ...favShows.map(s => ({ ...s, type: 'show' as const })),
        ...favMovies.map(m => ({ ...m, type: 'movie' as const })),
        ...favBooks.map(b => ({ ...b, type: 'book' as const })),
        ...favManga.map(m => ({ ...m, type: 'manga' as const }))
      ];
    }

    // Filter by search
    if (favoritesSearch.trim()) {
      const searchLower = favoritesSearch.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'show') return item.showName.toLowerCase().includes(searchLower);
        if (item.type === 'movie') return item.movieTitle.toLowerCase().includes(searchLower);
        if (item.type === 'book') return item.title.toLowerCase().includes(searchLower);
        if (item.type === 'manga') return item.title.toLowerCase().includes(searchLower);
        return false;
      });
    }

     // Sort
    const sorted = [...items].sort((a, b) => {
      const getTitle = (item: typeof items[0]) => {
         if (item.type === 'show') return item.showName;
         if (item.type === 'movie') return item.movieTitle;
         return item.title;
      };
      
      switch (favoritesSort) {
        case 'name':
          return getTitle(a).localeCompare(getTitle(b));
        case 'date':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'added':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [trackedShows, trackedMovies, trackedBooks, trackedManga, favoritesSubTab, favoritesSearch, favoritesSort]);

  // Render callbacks
  const renderShowItem = useCallback(({ item }: { item: TrackedShow & { airDate?: string; nextEpisode?: any; remainingEpisodes?: number } }) => (
    <ShowItem 
      item={item}
      activeTab={activeTab}
      showsSubTab={showsSubTab}
      hasNotification={hasNotification}
      getNotificationPreference={getNotificationPreference}
      getStatusColor={getStatusColor}
      getFormattedDate={getFormattedDate}
      t={t}
      onStatusChange={handleStatusChange}
      onNotificationPress={handleNotificationPress}
      onRemove={removeShow}
      onMarkEpisodeWatched={(showId, seasonNumber, episodeNumber) => markEpisodeWatched({ showId, seasonNumber, episodeNumber, episodeId: -1 })}
    />
  ), [activeTab, showsSubTab, hasNotification, getNotificationPreference, getStatusColor, getFormattedDate, t, handleStatusChange, handleNotificationPress, removeShow, markEpisodeWatched]);

  const renderUpcomingShowItem = useCallback(({ item }: { item: TrackedShow & { airDate: string; next_episode_to_air?: any } }) => (
    <UpcomingShowItem 
      item={item}
      hasNotification={hasNotification}
      getFormattedDate={getFormattedDate}
      t={t}
      onNotificationPress={handleNotificationPress}
      onRemove={removeShow}
    />
  ), [hasNotification, getFormattedDate, t, handleNotificationPress, removeShow]);

  const renderMovieItem = useCallback(({ item }: { item: TrackedMovie }) => (
    <MovieItem 
      item={item}
      activeTab={activeTab}
      moviesSubTab={moviesSubTab}
      hasNotification={hasNotification}
      getNotificationPreference={getNotificationPreference}
      getStatusColor={getStatusColor}
      getFormattedDate={getFormattedDate}
      t={t}
      onStatusChange={handleStatusChange}
      onNotificationPress={handleNotificationPress}
      onRemove={removeMovie}
    />
  ), [activeTab, moviesSubTab, hasNotification, getNotificationPreference, getStatusColor, getFormattedDate, t, handleStatusChange, handleNotificationPress, removeMovie]);

  const renderBookItem = useCallback(({ item }: { item: TrackedBook }) => (
    <BookItem 
      item={item}
      activeTab={activeTab}
      booksSubTab={booksSubTab}
      getStatusColor={getStatusColor}
      getFormattedDate={getFormattedDate}
      t={t}
      onStatusChange={(id, status) => handleStatusChange(id, 'book', status)}
      onRemove={removeBook}
      onUpdateProgress={(id, page) => updateBookProgress(id, page)}
    />
  ), [activeTab, booksSubTab, getStatusColor, getFormattedDate, t, handleStatusChange, removeBook]);

  const renderMangaItem = useCallback(({ item }: { item: TrackedManga }) => (
    <MangaItem 
      item={item}
      activeTab={activeTab}
      mangaSubTab={mangaSubTab} // Fix: was using non-existent activeTab
      getStatusColor={getStatusColor}
      getFormattedDate={getFormattedDate}
      t={t}
      onStatusChange={(id, status) => handleStatusChange(id, 'manga', status)}
      onRemove={removeManga}
      onUpdateProgress={(id, chapter, volume) => updateMangaProgress(id, chapter, volume)}
    />
  ), [activeTab, mangaSubTab, getStatusColor, getFormattedDate, t, handleStatusChange, removeManga]);


  const renderSortMenu = (type: 'shows' | 'movies' | 'books' | 'manga' | 'plan' | 'favorites') => {
    if (showSortMenu !== type) return null;

    const currentSort = type === 'shows' ? showsSort : type === 'movies' ? moviesSort : type === 'plan' ? planSort : favoritesSort;
    const setSort = type === 'shows' ? setShowsSort : type === 'movies' ? setMoviesSort : type === 'plan' ? setPlanSort : setFavoritesSort;

    return (
      <View style={styles.sortMenu}>
        {(['name', 'date', 'status', 'added'] as SortOption[]).map(option => {
          let label = '';
          switch (option) {
            case 'name': label = t.sortName; break;
            case 'date': label = t.sortDate; break;
            case 'status': label = t.sortStatus; break;
            case 'added': label = t.sortAdded; break;
          }
          
          return (
            <TouchableOpacity
              key={option}
              style={[styles.sortOption, currentSort === option && styles.sortOptionActive]}
              onPress={() => {
                setSort(option);
                setShowSortMenu(null);
              }}
            >
              <Text style={[styles.sortOptionText, currentSort === option && styles.sortOptionTextActive]}>
                {label}
              </Text>
              {currentSort === option && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  /* Header Content for FlashList */
  const headerContent = useMemo(() => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.profile}</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shows' && styles.activeTab]} 
          onPress={() => setActiveTab('shows')}
        >
          <Text style={[styles.tabText, activeTab === 'shows' && styles.activeTabText]}>{t.shows}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]} 
          onPress={() => setActiveTab('movies')}
        >
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>{t.movies}</Text>
        </TouchableOpacity>

        {showBooks && (
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'books' && styles.activeTab]} 
              onPress={() => setActiveTab('books')}
            >
              <Text style={[styles.tabText, activeTab === 'books' && styles.activeTabText]}>{t.books}</Text>
            </TouchableOpacity>
        )}

        {showManga && (
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'manga' && styles.activeTab]} 
              onPress={() => setActiveTab('manga')}
            >
              <Text style={[styles.tabText, activeTab === 'manga' && styles.activeTabText]}>{t.manga}</Text>
            </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'plan' && styles.activeTab]} 
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>{t.planToWatch}</Text>
        </TouchableOpacity>

        {showFavorites && (
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]} 
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>{t.favorites}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search and Sort Bar */}
      <View style={styles.searchSortContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.search}
            placeholderTextColor={Colors.textSecondary}
            value={activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : activeTab === 'books' ? booksSearch : activeTab === 'manga' ? mangaSearch : activeTab === 'plan' ? planSearch : favoritesSearch}
            onChangeText={activeTab === 'shows' ? setShowsSearch : activeTab === 'movies' ? setMoviesSearch : activeTab === 'books' ? setBooksSearch : activeTab === 'manga' ? setMangaSearch : activeTab === 'plan' ? setPlanSearch : setFavoritesSearch}
            autoCorrect={false}
          />
          {(activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : activeTab === 'books' ? booksSearch : activeTab === 'manga' ? mangaSearch : activeTab === 'plan' ? planSearch : favoritesSearch) ? (
            <TouchableOpacity onPress={() => activeTab === 'shows' ? setShowsSearch('') : activeTab === 'movies' ? setMoviesSearch('') : activeTab === 'books' ? setBooksSearch('') : activeTab === 'manga' ? setMangaSearch('') : activeTab === 'plan' ? setPlanSearch('') : setFavoritesSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(showSortMenu === activeTab ? null : activeTab)}
        >
          <Ionicons name="options-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
      {renderSortMenu(activeTab)}

      {/* Sub Tabs */}
      {activeTab === 'shows' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, showsSubTab === 'watched' && styles.activeSubTab]} 
            onPress={() => setShowsSubTab('watched')}
          >
            <Text style={[styles.subTabText, showsSubTab === 'watched' && styles.activeSubTabText]}>{t.watched}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, showsSubTab === 'in_progress' && styles.activeSubTab]} 
            onPress={() => setShowsSubTab('in_progress')}
          >
            <Text style={[styles.subTabText, showsSubTab === 'in_progress' && styles.activeSubTabText]}>{t.inProgress}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, showsSubTab === 'upcoming' && styles.activeSubTab]} 
            onPress={() => setShowsSubTab('upcoming')}
          >
            <Text style={[styles.subTabText, showsSubTab === 'upcoming' && styles.activeSubTabText]}>{t.upcoming}</Text>
          </TouchableOpacity>
          {showDroppedTab && (
            <TouchableOpacity 
              style={[styles.subTab, showsSubTab === 'dropped' && styles.activeSubTab]} 
              onPress={() => setShowsSubTab('dropped')}
            >
              <Text style={[styles.subTabText, showsSubTab === 'dropped' && styles.activeSubTabText]}>{t.statusDropped}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'movies' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, moviesSubTab === 'watched' && styles.activeSubTab]} 
            onPress={() => setMoviesSubTab('watched')}
          >
            <Text style={[styles.subTabText, moviesSubTab === 'watched' && styles.activeSubTabText]}>{t.watched}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, moviesSubTab === 'upcoming' && styles.activeSubTab]} 
            onPress={() => setMoviesSubTab('upcoming')}
          >
            <Text style={[styles.subTabText, moviesSubTab === 'upcoming' && styles.activeSubTabText]}>{t.upcoming}</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'books' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, booksSubTab === 'reading' && styles.activeSubTab]} 
            onPress={() => setBooksSubTab('reading')}
          >
            <Text style={[styles.subTabText, booksSubTab === 'reading' && styles.activeSubTabText]}>{t.reading}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, booksSubTab === 'read' && styles.activeSubTab]} 
            onPress={() => setBooksSubTab('read')}
          >
            <Text style={[styles.subTabText, booksSubTab === 'read' && styles.activeSubTabText]}>{t.read}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, booksSubTab === 'plan_to_read' && styles.activeSubTab]} 
            onPress={() => setBooksSubTab('plan_to_read')}
          >
            <Text style={[styles.subTabText, booksSubTab === 'plan_to_read' && styles.activeSubTabText]}>{t.planToRead}</Text>
          </TouchableOpacity>
           {showDroppedTab && (
            <TouchableOpacity 
              style={[styles.subTab, booksSubTab === 'dropped' && styles.activeSubTab]} 
              onPress={() => setBooksSubTab('dropped')}
            >
              <Text style={[styles.subTabText, booksSubTab === 'dropped' && styles.activeSubTabText]}>{t.statusDropped}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'manga' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, mangaSubTab === 'reading' && styles.activeSubTab]} 
            onPress={() => setMangaSubTab('reading')}
          >
            <Text style={[styles.subTabText, mangaSubTab === 'reading' && styles.activeSubTabText]}>{t.reading}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, mangaSubTab === 'read' && styles.activeSubTab]} 
            onPress={() => setMangaSubTab('read')}
          >
            <Text style={[styles.subTabText, mangaSubTab === 'read' && styles.activeSubTabText]}>{t.read}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, mangaSubTab === 'plan_to_read' && styles.activeSubTab]} 
            onPress={() => setMangaSubTab('plan_to_read')}
          >
            <Text style={[styles.subTabText, mangaSubTab === 'plan_to_read' && styles.activeSubTabText]}>{t.planToRead}</Text>
          </TouchableOpacity>
           {showDroppedTab && (
            <TouchableOpacity 
              style={[styles.subTab, mangaSubTab === 'dropped' && styles.activeSubTab]} 
              onPress={() => setMangaSubTab('dropped')}
            >
              <Text style={[styles.subTabText, mangaSubTab === 'dropped' && styles.activeSubTabText]}>{t.statusDropped}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}


      {activeTab === 'favorites' && (
        <View style={styles.subTabContainer}>
            <TouchableOpacity 
            style={[styles.subTab, favoritesSubTab === 'all' && styles.activeSubTab]} 
            onPress={() => setFavoritesSubTab('all')}
          >
            <Text style={[styles.subTabText, favoritesSubTab === 'all' && styles.activeSubTabText]}>{t.all}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, favoritesSubTab === 'shows' && styles.activeSubTab]} 
            onPress={() => setFavoritesSubTab('shows')}
          >
            <Text style={[styles.subTabText, favoritesSubTab === 'shows' && styles.activeSubTabText]}>{t.shows}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, favoritesSubTab === 'movies' && styles.activeSubTab]} 
            onPress={() => setFavoritesSubTab('movies')}
          >
            <Text style={[styles.subTabText, favoritesSubTab === 'movies' && styles.activeSubTabText]}>{t.movies}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, favoritesSubTab === 'books' && styles.activeSubTab]} 
            onPress={() => setFavoritesSubTab('books')}
          >
            <Text style={[styles.subTabText, favoritesSubTab === 'books' && styles.activeSubTabText]}>{t.books}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, favoritesSubTab === 'manga' && styles.activeSubTab]} 
            onPress={() => setFavoritesSubTab('manga')}
          >
            <Text style={[styles.subTabText, favoritesSubTab === 'manga' && styles.activeSubTabText]}>{t.manga}</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'plan' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, planSubTab === 'all' && styles.activeSubTab]} 
            onPress={() => setPlanSubTab('all')}
          >
            <Text style={[styles.subTabText, planSubTab === 'all' && styles.activeSubTabText]}>{t.all}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, planSubTab === 'shows' && styles.activeSubTab]} 
            onPress={() => setPlanSubTab('shows')}
          >
            <Text style={[styles.subTabText, planSubTab === 'shows' && styles.activeSubTabText]}>{t.shows}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, planSubTab === 'movies' && styles.activeSubTab]} 
            onPress={() => setPlanSubTab('movies')}
          >
            <Text style={[styles.subTabText, planSubTab === 'movies' && styles.activeSubTabText]}>{t.movies}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, planSubTab === 'books' && styles.activeSubTab]} 
            onPress={() => setPlanSubTab('books')}
          >
            <Text style={[styles.subTabText, planSubTab === 'books' && styles.activeSubTabText]}>{t.books}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, planSubTab === 'manga' && styles.activeSubTab]} 
            onPress={() => setPlanSubTab('manga')}
          >
            <Text style={[styles.subTabText, planSubTab === 'manga' && styles.activeSubTabText]}>{t.manga}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [
    activeTab, 
    showsSubTab, moviesSubTab, booksSubTab, mangaSubTab, favoritesSubTab, planSubTab,
    showsSearch, moviesSearch, booksSearch, mangaSearch, planSearch, favoritesSearch,
    showSortMenu, showsSort, moviesSort, booksSort, mangaSort, planSort, favoritesSort,
    showBooks, showManga, showDroppedTab,
    t
  ]);

  const renderShowOrUpcomingItem = useCallback(({ item }: { item: any }) => {
      if (showsSubTab === 'upcoming') {
          return renderUpcomingShowItem({ item });
      }
      return renderShowItem({ item });
  }, [showsSubTab, renderUpcomingShowItem, renderShowItem]);

  const renderFavoriteList = useCallback(({ item }: { item: any }) => {
      if (item.type === 'show') return renderShowItem({ item: item });
      if (item.type === 'movie') return renderMovieItem({ item: item });
      if (item.type === 'book') return renderBookItem({ item: item });
      return renderMangaItem({ item: item });
  }, [renderShowItem, renderMovieItem, renderBookItem, renderMangaItem]);

  const renderPlanList = useCallback(({ item }: { item: any }) => {
      if (item.type === 'show') return renderShowItem({ item: item });
      if (item.type === 'movie') return renderMovieItem({ item: item });
      if (item.type === 'book') return renderBookItem({ item: item });
      return renderMangaItem({ item: item });
  }, [renderShowItem, renderMovieItem, renderBookItem, renderMangaItem]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ paddingHorizontal: 16 }}>
        {headerContent}
      </View>
      
      {activeTab === 'shows' ? (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredShows}
          keyExtractor={(item) => item.showId.toString()}
          renderItem={renderShowOrUpcomingItem}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            (showsSubTab === 'upcoming' && showDetailsQueries.isLoading) ? (
              <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>{t.loadingUpcomingShows}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="tv-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {showsSubTab === 'watched' ? t.noWatchedShows :
                  showsSubTab === 'in_progress' ? t.noTrackedShows :
                  t.noUpcomingShows}
                </Text>
              </View>
            )
          }
        />
      ) : activeTab === 'movies' ? (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredMovies}
          keyExtractor={(item) => item.movieId.toString()}
          renderItem={renderMovieItem}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            (moviesSubTab === 'upcoming' && movieDetailsQueries.isLoading) ? (
              <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>{t.loadingUpcomingMovies}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="film-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {moviesSubTab === 'watched' ? t.noWatchedMovies :
                  t.noUpcomingMovies}
                </Text>
              </View>
            )
          }
        />
      ) : activeTab === 'books' ? (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>
                 {t.noItemsInList}
              </Text>
            </View>
          }
        />
      ) : activeTab === 'manga' ? (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredManga}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMangaItem}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={64} color={Colors.textSecondary} />
               <Text style={styles.emptyText}>
                 {t.noItemsInList}
              </Text>
            </View>
          }
        />
      ) : activeTab === 'favorites' ? (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredFavorites}
          keyExtractor={(item, index) => {
            const prefix = item.type === 'show' ? 'show' : item.type === 'movie' ? 'movie' : item.type === 'book' ? 'book' : 'manga';
            // @ts-ignore
            const id = item.showId || item.movieId || item.id;
            return `${prefix}-fav-${id}-idx${index}`;
          }}
          renderItem={renderFavoriteList}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>{t.findFavorites}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          data={filteredPlanItems}
          keyExtractor={(item, index) => {
            const prefix = item.type === 'show' ? 'show' : item.type === 'movie' ? 'movie' : item.type === 'book' ? 'book' : 'manga';
            // @ts-ignore
            const id = item.showId || item.movieId || item.id;
            // Use index to ensure uniqueness even if somehow duplicates exist
            return `${prefix}-${id}-idx${index}`;
          }}
          renderItem={renderPlanList}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="bookmark-outline" size={64} color={Colors.textSecondary} /><Text style={styles.emptyText}>{t.noPlanItems}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingsButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.text },

  tabContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tab: { minWidth: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.surface, borderRadius: 10 },
  activeTab: { borderWidth: 1, borderColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.text },
  searchSortContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  sortButton: { padding: 8, backgroundColor: Colors.surface, borderRadius: 8 },
  sortMenu: { marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 8, overflow: 'hidden' },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceLight },
  sortOptionActive: { backgroundColor: Colors.surfaceLight },
  sortOptionText: { fontSize: 14, color: Colors.textSecondary },
  sortOptionTextActive: { color: Colors.text, fontWeight: '600' },
  subTabContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.surface, borderRadius: 8 },
  activeSubTab: { borderWidth: 1, borderColor: Colors.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  activeSubTabText: { color: Colors.text },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  itemCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center' },
  itemPoster: { width: 60, height: 90, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  itemInfo: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: Colors.text, textTransform: 'capitalize' },
  progressText: { fontSize: 12, color: Colors.textSecondary },
  notificationText: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  notificationButton: { padding: 4 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
});
