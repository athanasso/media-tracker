/**
 * Profile Screen - Watchlist Management
 */

import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { getPosterUrl } from '@/src/services/api/client';
import { useNotificationStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [activeTab, setActiveTab] = useState<'shows' | 'movies' | 'plan'>('shows');
  const [showsSubTab, setShowsSubTab] = useState<'watched' | 'watchlist' | 'upcoming'>('watchlist');
  const [moviesSubTab, setMoviesSubTab] = useState<'watched' | 'watchlist' | 'upcoming'>('watchlist');
  const [planSubTab, setPlanSubTab] = useState<'shows' | 'movies' | 'all'>('all');
  
  // Search and sort states
  const [showsSearch, setShowsSearch] = useState('');
  const [moviesSearch, setMoviesSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [showsSort, setShowsSort] = useState<SortOption>('name');
  const [moviesSort, setMoviesSort] = useState<SortOption>('name');
  const [planSort, setPlanSort] = useState<SortOption>('name');
  const [showSortMenu, setShowSortMenu] = useState<'shows' | 'movies' | 'plan' | null>(null);

  const { trackedShows, trackedMovies, removeShow, removeMovie, getWatchedEpisodesCount, updateShowStatus, updateMovieStatus } = useWatchlistStore();
  const { 
    addNotification, 
    removeNotification, 
    hasNotification, 
    getNotificationPreference 
  } = useNotificationStore();

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notification Permission',
          'Please enable notifications in your device settings to receive reminders for upcoming releases.'
        );
      }
    })();
  }, []);

  // Get plan to watch items for upcoming
  const planToWatchShows = useMemo(() => trackedShows.filter(s => s.status === 'plan_to_watch'), [trackedShows]);
  const planToWatchMovies = useMemo(() => trackedMovies.filter(m => m.status === 'plan_to_watch'), [trackedMovies]);

  // Fetch details for upcoming shows to get air dates
  // Get shows that might have upcoming episodes (Plan to Watch, Watching, Completed)
  const upcomingCandidateShows = useMemo(() => 
    trackedShows.filter(s => ['plan_to_watch', 'watching', 'completed'].includes(s.status)), 
    [trackedShows]
  );

  const upcomingMovieIds = useMemo(() => 
    moviesSubTab === 'upcoming' ? planToWatchMovies.map(m => m.movieId) : [],
    [moviesSubTab, planToWatchMovies]
  );

  // Fetch show details for upcoming shows
  const upcomingShowIds = useMemo(() => 
    showsSubTab === 'upcoming' ? upcomingCandidateShows.map(s => s.showId) : [],
    [showsSubTab, upcomingCandidateShows]
  );

  // Fetch show details for upcoming shows
  const showDetailsQueries = useQuery({
    queryKey: ['upcoming-shows', upcomingShowIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        upcomingShowIds.map(id => getShowDetails(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getShowDetails>>> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: upcomingShowIds.length > 0 && showsSubTab === 'upcoming',
  });

  // Fetch movie details for upcoming movies
  const movieDetailsQueries = useQuery({
    queryKey: ['upcoming-movies', upcomingMovieIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        upcomingMovieIds.map(id => getMovieDetails(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getMovieDetails>>> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: upcomingMovieIds.length > 0 && moviesSubTab === 'upcoming',
  });

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
      'Change Status',
      'Select a new status',
      [
        ...statusOptions.map(status => ({
          text: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          onPress: () => {
            if (type === 'show') {
              updateShowStatus(id, status);
            } else {
              updateMovieStatus(id, status);
            }
          },
          style: status === currentStatus ? 'cancel' : 'default' as any,
        })),
        { text: 'Cancel', style: 'cancel' as any },
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
        'Notification Settings',
        `You have a notification set for ${name}. What would you like to do?`,
        [
          {
            text: 'Change Timing',
            onPress: () => showTimingSelector(id, type, name, airDate, currentPref?.timing || '1 day'),
          },
          {
            text: 'Remove Notification',
            style: 'destructive' as any,
            onPress: async () => {
              await removeNotification(id, type);
              Alert.alert('Notification Removed', 'You will no longer receive reminders for this item.');
            },
          },
          { text: 'Cancel', style: 'cancel' as any },
        ]
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
      { label: '1 day before', value: '1 day' },
      { label: '3 days before', value: '3 days' },
      { label: '1 week before', value: '1 week' },
    ];

    Alert.alert(
      'Set Notification',
      `When would you like to be notified about ${name}?`,
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
                'Notification Set',
                `You'll be notified ${option.label.toLowerCase()} the release date.`
              );
            } catch {
              Alert.alert('Error', 'Failed to set notification. Please try again.');
            }
          },
          style: currentTiming === option.value ? 'default' : 'default' as any,
        })),
        { text: 'Cancel', style: 'cancel' as any },
      ]
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
  const getFilteredShows = (subTab: 'watched' | 'watchlist' | 'upcoming') => {
    let shows: (TrackedShow & { airDate?: string })[] = [];

    if (subTab === 'watched') {
      shows = trackedShows.filter(s => s.status === 'completed' || s.status === 'watching');
    } else if (subTab === 'watchlist') {
      shows = trackedShows;
    } else if (subTab === 'upcoming') {
      // Filter plan_to_watch shows with future air dates
      const showDetailsMap = new Map(
        (showDetailsQueries.data || []).map(show => [show.id, show])
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      shows = upcomingCandidateShows
        .map(show => {
          const details = showDetailsMap.get(show.showId);
          if (!details) return null;
          
          // Check next episode to air or first air date
          const airDate = details.next_episode_to_air?.air_date || details.first_air_date;
          if (!airDate) return null;
          
          const airDateObj = new Date(airDate);
          airDateObj.setHours(0, 0, 0, 0);
          
          if (airDateObj >= today) {
            return { ...show, airDate };
          }
          return null;
        })
        .filter((show): show is TrackedShow & { airDate: string } => show !== null);
    }

    return filterAndSort(shows, showsSearch, showsSort, (s) => s.showName);
  };

  // Get filtered and sorted movies
  const getFilteredMovies = (subTab: 'watched' | 'watchlist' | 'upcoming') => {
    let movies: (TrackedMovie & { releaseDate?: string })[] = [];

    if (subTab === 'watched') {
      movies = trackedMovies.filter(m => m.status === 'completed' || m.status === 'watching');
    } else if (subTab === 'watchlist') {
      movies = trackedMovies;
    } else if (subTab === 'upcoming') {
      // Filter plan_to_watch movies with future release dates
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
  };

  // Get filtered and sorted plan to watch items
  const getFilteredPlanItems = () => {
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
  };

  const renderShowItem = ({ item }: { item: TrackedShow & { airDate?: string } }) => {
    const hasNotif = item.airDate ? hasNotification(item.showId, 'show') : false;
    const notifPref = item.airDate ? getNotificationPreference(item.showId, 'show') : undefined;
    
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/show/${item.showId}`)}>
        <Image source={{ uri: getPosterUrl(item.posterPath, 'small') || '' }} style={styles.itemPoster} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.showName}</Text>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
            onPress={() => handleStatusChange(item.showId, 'show', item.status)}
          >
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
          {item.airDate ? (
            <>
              <Text style={styles.progressText}>Air Date: {new Date(item.airDate).toLocaleDateString()}</Text>
              {hasNotif && notifPref && (
                <Text style={styles.notificationText}>
                  🔔 Notify {notifPref.timing} before
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.progressText}>{getWatchedEpisodesCount(item.showId)} episodes watched</Text>
          )}
        </View>
        <View style={styles.itemActions}>
          {item.airDate && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleNotificationPress(item.showId, 'show', item.showName, item.airDate!);
              }}
              style={styles.notificationButton}
            >
              <Ionicons 
                name={hasNotif ? "notifications" : "notifications-outline"} 
                size={20} 
                color={hasNotif ? Colors.primary : Colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert('Remove?', '', [{ text: 'Cancel' }, { text: 'Remove', onPress: () => removeShow(item.showId) }]);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMovieItem = ({ item }: { item: TrackedMovie & { releaseDate?: string } }) => {
    const hasNotif = item.releaseDate ? hasNotification(item.movieId, 'movie') : false;
    const notifPref = item.releaseDate ? getNotificationPreference(item.movieId, 'movie') : undefined;
    
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/movie/${item.movieId}`)}>
        <Image source={{ uri: getPosterUrl(item.posterPath, 'small') || '' }} style={styles.itemPoster} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.movieTitle}</Text>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
            onPress={() => handleStatusChange(item.movieId, 'movie', item.status)}
          >
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
          {item.releaseDate ? (
            <>
              <Text style={styles.progressText}>Release Date: {new Date(item.releaseDate).toLocaleDateString()}</Text>
              {hasNotif && notifPref && (
                <Text style={styles.notificationText}>
                  🔔 Notify {notifPref.timing} before
                </Text>
              )}
            </>
          ) : null}
        </View>
        <View style={styles.itemActions}>
          {item.releaseDate && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleNotificationPress(item.movieId, 'movie', item.movieTitle, item.releaseDate!);
              }}
              style={styles.notificationButton}
            >
              <Ionicons 
                name={hasNotif ? "notifications" : "notifications-outline"} 
                size={20} 
                color={hasNotif ? Colors.primary : Colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert('Remove?', '', [{ text: 'Cancel' }, { text: 'Remove', onPress: () => removeMovie(item.movieId) }]);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortMenu = (type: 'shows' | 'movies' | 'plan') => {
    if (showSortMenu !== type) return null;

    const currentSort = type === 'shows' ? showsSort : type === 'movies' ? moviesSort : planSort;
    const setSort = type === 'shows' ? setShowsSort : type === 'movies' ? setMoviesSort : setPlanSort;

    return (
      <View style={styles.sortMenu}>
        {(['name', 'date', 'status', 'added'] as SortOption[]).map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.sortOption, currentSort === option && styles.sortOptionActive]}
            onPress={() => {
              setSort(option);
              setShowSortMenu(null);
            }}
          >
            <Text style={[styles.sortOptionText, currentSort === option && styles.sortOptionTextActive]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
            {currentSort === option && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.navigate('/settings' as any)}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{trackedShows.length}</Text><Text style={styles.statLabel}>Shows</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{trackedMovies.length}</Text><Text style={styles.statLabel}>Movies</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{planToWatchShows.length + planToWatchMovies.length}</Text><Text style={styles.statLabel}>Plan to Watch</Text></View>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'shows' && styles.activeTab]} onPress={() => setActiveTab('shows')}>
          <Text style={[styles.tabText, activeTab === 'shows' && styles.activeTabText]}>TV Shows</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'movies' && styles.activeTab]} onPress={() => setActiveTab('movies')}>
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'plan' && styles.activeTab]} onPress={() => setActiveTab('plan')}>
          <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>Plan to Watch</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Sort Bar */}
      <View style={styles.searchSortContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={Colors.textSecondary}
            value={activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : planSearch}
            onChangeText={activeTab === 'shows' ? setShowsSearch : activeTab === 'movies' ? setMoviesSearch : setPlanSearch}
          />
          {(activeTab === 'shows' ? showsSearch : activeTab === 'movies' ? moviesSearch : planSearch) ? (
            <TouchableOpacity onPress={() => activeTab === 'shows' ? setShowsSearch('') : activeTab === 'movies' ? setMoviesSearch('') : setPlanSearch('')}>
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
              <Text style={[styles.subTabText, showsSubTab === 'watched' && styles.activeSubTabText]}>Watched</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, showsSubTab === 'watchlist' && styles.activeSubTab]} 
              onPress={() => setShowsSubTab('watchlist')}
            >
              <Text style={[styles.subTabText, showsSubTab === 'watchlist' && styles.activeSubTabText]}>Watchlist</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, showsSubTab === 'upcoming' && styles.activeSubTab]} 
              onPress={() => setShowsSubTab('upcoming')}
            >
              <Text style={[styles.subTabText, showsSubTab === 'upcoming' && styles.activeSubTabText]}>Upcoming</Text>
            </TouchableOpacity>
          </View>
          {showsSubTab === 'upcoming' && showDetailsQueries.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading upcoming shows...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredShows(showsSubTab)}
              keyExtractor={(item) => item.showId.toString()}
              renderItem={renderShowItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="tv-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {showsSubTab === 'watched' ? 'No watched shows yet' :
                     showsSubTab === 'watchlist' ? 'No shows tracked yet' :
                     'No upcoming shows in your plan to watch'}
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
              <Text style={[styles.subTabText, moviesSubTab === 'watched' && styles.activeSubTabText]}>Watched</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, moviesSubTab === 'watchlist' && styles.activeSubTab]} 
              onPress={() => setMoviesSubTab('watchlist')}
            >
              <Text style={[styles.subTabText, moviesSubTab === 'watchlist' && styles.activeSubTabText]}>Watchlist</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, moviesSubTab === 'upcoming' && styles.activeSubTab]} 
              onPress={() => setMoviesSubTab('upcoming')}
            >
              <Text style={[styles.subTabText, moviesSubTab === 'upcoming' && styles.activeSubTabText]}>Upcoming</Text>
            </TouchableOpacity>
          </View>
          {moviesSubTab === 'upcoming' && movieDetailsQueries.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading upcoming movies...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredMovies(moviesSubTab)}
              keyExtractor={(item) => item.movieId.toString()}
              renderItem={renderMovieItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {moviesSubTab === 'watched' ? 'No watched movies yet' :
                     moviesSubTab === 'watchlist' ? 'No movies tracked yet' :
                     'No upcoming movies in your plan to watch'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          <View style={styles.subTabContainer}>
            <TouchableOpacity 
              style={[styles.subTab, planSubTab === 'all' && styles.activeSubTab]} 
              onPress={() => setPlanSubTab('all')}
            >
              <Text style={[styles.subTabText, planSubTab === 'all' && styles.activeSubTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, planSubTab === 'shows' && styles.activeSubTab]} 
              onPress={() => setPlanSubTab('shows')}
            >
              <Text style={[styles.subTabText, planSubTab === 'shows' && styles.activeSubTabText]}>Shows</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTab, planSubTab === 'movies' && styles.activeSubTab]} 
              onPress={() => setPlanSubTab('movies')}
            >
              <Text style={[styles.subTabText, planSubTab === 'movies' && styles.activeSubTabText]}>Movies</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={getFilteredPlanItems()}
            keyExtractor={(item, index) => {
              // Ensure unique keys by combining type and id (index as fallback for safety)
              const prefix = item.type === 'show' ? 'show' : 'movie';
              const id = item.type === 'show' ? item.showId : item.movieId;
              // Use index to ensure uniqueness even if somehow duplicates exist
              return `${prefix}-${id}-idx${index}`;
            }}
            renderItem={({ item }) => item.type === 'show' ? renderShowItem({ item: item }) : renderMovieItem({ item: item })}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="bookmark-outline" size={64} color={Colors.textSecondary} /><Text style={styles.emptyText}>No items in your plan to watch</Text></View>}
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
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
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
