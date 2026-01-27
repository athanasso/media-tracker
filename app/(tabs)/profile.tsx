/**
 * Profile Screen - Watchlist Management
 */

import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { useNotificationStore, useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MovieItem from '../components/MovieItem';
import ShowItem from '../components/ShowItem';
import UpcomingShowItem from '../components/UpcomingShowItem';

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
};

import { strings } from '@/src/i18n/strings';

type SortOption = 'name' | 'date' | 'status' | 'added';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'shows' | 'movies' | 'plan' | 'favorites'>('shows');
  const [showsSubTab, setShowsSubTab] = useState<'watched' | 'in_progress' | 'upcoming'>('in_progress');
  const [moviesSubTab, setMoviesSubTab] = useState<'watched' | 'upcoming'>('watched');

  const [planSubTab, setPlanSubTab] = useState<'shows' | 'movies' | 'all'>('all');
  const [favoritesSubTab, setFavoritesSubTab] = useState<'shows' | 'movies' | 'all'>('all');
  
  // Search and sort states
  const [showsSearch, setShowsSearch] = useState('');
  const [moviesSearch, setMoviesSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [favoritesSearch, setFavoritesSearch] = useState('');
  const [showsSort, setShowsSort] = useState<SortOption>('added');
  const [moviesSort, setMoviesSort] = useState<SortOption>('added');
  const [planSort, setPlanSort] = useState<SortOption>('added');
  const [favoritesSort, setFavoritesSort] = useState<SortOption>('added');
  const [showSortMenu, setShowSortMenu] = useState<'shows' | 'movies' | 'plan' | 'favorites' | null>(null);

  const { trackedShows, trackedMovies, removeShow, removeMovie, getWatchedEpisodesCount, updateShowStatus, updateMovieStatus } = useWatchlistStore();
  const { 
    addNotification, 
    removeNotification, 
    hasNotification, 
    getNotificationPreference 
  } = useNotificationStore();
  const { getFormattedDate, language } = useSettingsStore();

  const t = strings[language] || strings.en;

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
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
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
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      enabled: moviesSubTab === 'upcoming',
    }))
  });

  const movieDetailsQueries = useMemo(() => ({
    data: movieDetailsQueriesResult.map(q => q.data).filter(Boolean) as Awaited<ReturnType<typeof getMovieDetails>>[],
    isLoading: movieDetailsQueriesResult.some(q => q.isLoading && q.fetchStatus !== 'idle'),
  }), [movieDetailsQueriesResult]);

  const getStatusColor = (status: TrackingStatus) => {
    const colors: Record<TrackingStatus, string> = {
      watching: '#22c55e', completed: '#3b82f6', plan_to_watch: '#f59e0b',
      on_hold: '#8b5cf6', dropped: '#ef4444',
    };
    return colors[status] || Colors.textSecondary;
  };

  const handleStatusChange = (id: number, type: 'show' | 'movie', currentStatus: TrackingStatus) => {
    const statusOptions: TrackingStatus[] = ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'];

    Alert.alert(
      t.changeStatus,
      t.selectStatus,
      [
        ...statusOptions.map(status => {
          let label = '';
          switch (status) {
            case 'watching': label = t.statusWatching; break;
            case 'completed': label = t.statusCompleted; break;
            case 'plan_to_watch': label = t.statusPlanToWatch; break;
            case 'on_hold': label = t.statusOnHold; break;
            case 'dropped': label = t.statusDropped; break;
          }
          
          return {
            text: label,
          onPress: () => {
            if (type === 'show') {
              updateShowStatus(id, status);
            } else {
              updateMovieStatus(id, status);
            }
          },
          style: status === currentStatus ? 'cancel' : 'default' as any,
        };
        }),
        { text: t.cancel, style: 'cancel' as any },
      ]
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
  const filterAndSort = <T extends TrackedShow | TrackedMovie>(
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
  };

  // Get filtered and sorted shows
  const filteredShows = useMemo(() => {
    let shows: (TrackedShow & { airDate?: string })[] = [];
    const showDetailsMap = new Map(
      (showDetailsQueries.data || []).map(show => [show.id, show])
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCaughtUp = (show: TrackedShow) => {
        const details = showDetailsMap.get(show.showId);
        if (show.status === 'completed') return true;
        if (!details) return false;
        
        const lastEpisode = details.last_episode_to_air;
        if (!lastEpisode) return true;

        return show.watchedEpisodes.some(
            e => e.seasonNumber === lastEpisode.season_number && e.episodeNumber === lastEpisode.episode_number
        );
    };

    if (showsSubTab === 'watched') {
      shows = trackedShows.filter(s => {
          if (s.status === 'completed') return true;
          if (s.status === 'watching') {
              return isCaughtUp(s);
          }
          return false;
      });
    } else if (showsSubTab === 'in_progress') {
      shows = trackedShows.filter(s => {
          if (s.status === 'watching') {
              return !isCaughtUp(s);
          }
          return false;
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
    }

    return filterAndSort(shows, showsSearch, showsSort, (s) => s.showName);
  }, [trackedShows, showsSubTab, showDetailsQueries.data, showsToFetchDetails, showsSearch, showsSort]);

  // Get filtered and sorted movies
  const filteredMovies = useMemo(() => {
    let movies: (TrackedMovie & { releaseDate?: string })[] = [];

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

  // Get filtered and sorted plan to watch items
  const filteredPlanItems = useMemo(() => {
    type PlanItem = (TrackedShow & { type: 'show' }) | (TrackedMovie & { type: 'movie' });
    let items: PlanItem[] = [];

    if (planSubTab === 'shows') {
      items = planToWatchShows.map(s => ({ ...s, type: 'show' as const }));
    } else if (planSubTab === 'movies') {
      items = planToWatchMovies.map(m => ({ ...m, type: 'movie' as const }));
    } else {
      items = [
        ...planToWatchShows.map(s => ({ ...s, type: 'show' as const })),
        ...planToWatchMovies.map(m => ({ ...m, type: 'movie' as const }))
      ];
    }

    // Remove duplicates based on type and id
    const seen = new Set<string>();
    items = items.filter(item => {
      const key = item.type === 'show' ? `show-${item.showId}` : `movie-${item.movieId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Filter by search
    if (planSearch.trim()) {
      const searchLower = planSearch.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'show') {
          return item.showName.toLowerCase().includes(searchLower);
        } else {
          return item.movieTitle.toLowerCase().includes(searchLower);
        }
      });
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      const getTitle = (item: typeof items[0]) => item.type === 'show' ? item.showName : item.movieTitle;
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
  }, [planToWatchShows, planToWatchMovies, planSubTab, planSearch, planSort]);

  // Get filtered and sorted favorite items
  const filteredFavorites = useMemo(() => {
    type FavoriteItem = (TrackedShow & { type: 'show' }) | (TrackedMovie & { type: 'movie' });
    let items: FavoriteItem[] = [];

    if (favoritesSubTab === 'shows') {
      items = favoriteShows.map(s => ({ ...s, type: 'show' as const }));
    } else if (favoritesSubTab === 'movies') {
      items = favoriteMovies.map(m => ({ ...m, type: 'movie' as const }));
    } else {
      items = [
        ...favoriteShows.map(s => ({ ...s, type: 'show' as const })),
        ...favoriteMovies.map(m => ({ ...m, type: 'movie' as const }))
      ];
    }

    // Filter by search
    if (favoritesSearch.trim()) {
      const searchLower = favoritesSearch.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'show') {
          return item.showName.toLowerCase().includes(searchLower);
        } else {
          return item.movieTitle.toLowerCase().includes(searchLower);
        }
      });
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      const getTitle = (item: typeof items[0]) => item.type === 'show' ? item.showName : item.movieTitle;
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
  }, [favoriteShows, favoriteMovies, favoritesSubTab, favoritesSearch, favoritesSort]);

  // Render callbacks
  const renderShowItem = useCallback(({ item }: { item: TrackedShow & { airDate?: string } }) => (
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
    />
  ), [activeTab, showsSubTab, hasNotification, getNotificationPreference, getStatusColor, getFormattedDate, t, handleStatusChange, handleNotificationPress, removeShow]);

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

  const renderMovieItem = useCallback(({ item }: { item: TrackedMovie & { releaseDate?: string } }) => (
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


  const renderSortMenu = (type: 'shows' | 'movies' | 'plan' | 'favorites') => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.profile}</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push({ pathname: '/stats', params: { type: 'shows' } })}
        >
          <Text style={styles.statNumber}>{trackedShows.length}</Text>
          <Text style={styles.statLabel}>{t.shows}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push({ pathname: '/stats', params: { type: 'movies' } })}
        >
          <Text style={styles.statNumber}>{trackedMovies.length}</Text>
          <Text style={styles.statLabel}>{t.movies}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push({ pathname: '/stats', params: { type: 'episodes' } })}
        >
          <Text style={styles.statNumber}>{totalWatchedEpisodes}</Text>
          <Text style={styles.statLabel}>{t.episodes}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tabs */}
      {/* Main Tabs - 2x2 Grid */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
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
        </View>
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'plan' && styles.activeTab]} 
            onPress={() => setActiveTab('plan')}
          >
            <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>{t.planToWatch}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]} 
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>{t.favorites}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Sort Bar */}
      <View style={styles.searchSortContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.search}
            placeholderTextColor={Colors.textSecondary}
            value={activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : activeTab === 'plan' ? planSearch : favoritesSearch}
            onChangeText={activeTab === 'shows' ? setShowsSearch : activeTab === 'movies' ? setMoviesSearch : activeTab === 'plan' ? setPlanSearch : setFavoritesSearch}
          />
          {(activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : activeTab === 'plan' ? planSearch : favoritesSearch) ? (
            <TouchableOpacity onPress={() => activeTab === 'shows' ? setShowsSearch('') : activeTab === 'movies' ? setMoviesSearch('') : activeTab === 'plan' ? setPlanSearch('') : setFavoritesSearch('')}>
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

      {activeTab === 'shows' ? (
        <>
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
          </View>
          {showsSubTab === 'upcoming' && showDetailsQueries.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t.loadingUpcomingShows}</Text>
            </View>
          ) : (
              <FlatList
                data={filteredShows}
                keyExtractor={(item) => item.showId.toString()}
                renderItem={(props) => showsSubTab === 'upcoming' 
                  ? renderUpcomingShowItem(props as any) 
                  : renderShowItem(props)
                }
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="tv-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {showsSubTab === 'watched' ? t.noWatchedShows :
                     showsSubTab === 'in_progress' ? t.noTrackedShows :
                     t.noUpcomingShows}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : activeTab === 'movies' ? (
        <>
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
          {moviesSubTab === 'upcoming' && movieDetailsQueries.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t.loadingUpcomingMovies}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMovies}
              keyExtractor={(item) => item.movieId.toString()}
              renderItem={renderMovieItem}
              contentContainerStyle={styles.listContent}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {moviesSubTab === 'watched' ? t.noWatchedMovies :
                     t.noUpcomingMovies}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : activeTab === 'favorites' ? (
        <>
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
          </View>
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item, index) => {
              // Ensure unique keys
              const prefix = item.type === 'show' ? 'show' : 'movie';
              const id = item.type === 'show' ? item.showId : item.movieId;
              return `${prefix}-fav-${id}-idx${index}`;
            }}
            renderItem={({ item }) => item.type === 'show' ? renderShowItem({ item: item as TrackedShow }) : renderMovieItem({ item: item as TrackedMovie })}
            contentContainerStyle={styles.listContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>{t.findFavorites}</Text>
              </View>
            }
          />
        </>
      ) : (
        <>
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
          </View>
          <FlatList
            data={filteredPlanItems}
            keyExtractor={(item, index) => {
              // Ensure unique keys by combining type and id (index as fallback for safety)
              const prefix = item.type === 'show' ? 'show' : 'movie';
              const id = item.type === 'show' ? item.showId : item.movieId;
              // Use index to ensure uniqueness even if somehow duplicates exist
              return `${prefix}-${id}-idx${index}`;
            }}
            renderItem={({ item }) => item.type === 'show' ? renderShowItem({ item: item as TrackedShow }) : renderMovieItem({ item: item as TrackedMovie })}
            contentContainerStyle={styles.listContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="bookmark-outline" size={64} color={Colors.textSecondary} /><Text style={styles.emptyText}>{t.noPlanItems}</Text></View>}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  settingsButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  tabContainer: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.surface, borderRadius: 10 },
  activeTab: { borderWidth: 1, borderColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.text },
  searchSortContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  sortButton: { padding: 8, backgroundColor: Colors.surface, borderRadius: 8 },
  sortMenu: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 8, overflow: 'hidden' },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceLight },
  sortOptionActive: { backgroundColor: Colors.surfaceLight },
  sortOptionText: { fontSize: 14, color: Colors.textSecondary },
  sortOptionTextActive: { color: Colors.text, fontWeight: '600' },
  subTabContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
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
