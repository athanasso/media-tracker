/**
 * Search Screen
 * Search for TV shows, movies, books, and manga
 */

import { useDebouncedValue } from '@/src/hooks/useDebounce';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/src/i18n/strings';
import { getTrendingAll, searchMulti } from '@/src/services/api';
import { searchBooks } from '@/src/services/api/books';
import { searchManga } from '@/src/services/api/manga';
import { getPosterUrl } from '@/src/services/api/client';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { MultiSearchResult, Book, Manga } from '@/src/types';

// App colors
const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  border: '#333333',
};

type SearchType = 'tv_movie' | 'book' | 'manga';

export default function SearchScreen() {
  const router = useRouter();
  const { getFormattedDate, language, showBooks, showManga } = useSettingsStore();

  const t = strings[language] || strings.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('tv_movie');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const debouncedQuery = useDebouncedValue(searchQuery, 500);

  const { trackedShows, trackedMovies, trackedBooks, trackedManga } = useWatchlistStore();

  // TMDB Search query
  const {
    data: tmdbResults,
    isLoading: searchingTmdb,
    isFetching: fetchingTmdb,
  } = useQuery({
    queryKey: ['search', 'tmdb', debouncedQuery, language],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: searchType === 'tv_movie' && debouncedQuery.length >= 2,
    staleTime: 6 * 60 * 60 * 1000,
  });

  // Books Search query
  const {
    data: bookResults,
    isLoading: searchingBooks,
    isFetching: fetchingBooks,
  } = useQuery({
    queryKey: ['search', 'books', debouncedQuery],
    queryFn: () => searchBooks(debouncedQuery),
    enabled: searchType === 'book' && debouncedQuery.length >= 2,
    staleTime: 6 * 60 * 60 * 1000,
  });

  // Manga Search query
  const {
    data: mangaResults,
    isLoading: searchingManga,
    isFetching: fetchingManga,
  } = useQuery({
    queryKey: ['search', 'manga', debouncedQuery],
    queryFn: () => searchManga(debouncedQuery),
    enabled: searchType === 'manga' && debouncedQuery.length >= 2,
    staleTime: 6 * 60 * 60 * 1000,
  });

  // Trending for empty state (only for tv_movie for now)
  const { data: trending } = useQuery({
    queryKey: ['trending', 'all', 'day', language],
    queryFn: () => getTrendingAll('day'),
    enabled: debouncedQuery.length < 2 && searchType === 'tv_movie',
    staleTime: 6 * 60 * 60 * 1000,
  });

  const getStatusInfo = useCallback((item: MultiSearchResult | Book | Manga) => {
    let status: string | undefined;
    
    // Check if item is tracked
    if (searchType === 'tv_movie') {
      const i = item as MultiSearchResult;
      if (i.media_type === 'tv') status = trackedShows.find(s => s.showId === i.id)?.status;
      if (i.media_type === 'movie') status = trackedMovies.find(m => m.movieId === i.id)?.status;
    } else if (searchType === 'book') {
      const b = item as Book;
      status = trackedBooks.find(tb => tb.id === b.id)?.status;
    } else if (searchType === 'manga') {
      const m = item as Manga;
      status = trackedManga.find(tm => tm.id === m.id)?.status;
    }

    if (!status) return null;

    let color = Colors.primary;
    let label = '';

    switch (status) {
      case 'watching':
        color = '#22c55e';
        label = (searchType === 'book' || searchType === 'manga') ? t.reading : t.statusWatching;
        break;
      case 'completed':
        color = '#3b82f6';
        label = (searchType === 'book' || searchType === 'manga') ? t.read : t.statusCompleted;
        break;
      case 'plan_to_watch':
        color = '#f59e0b';
        label = t.statusPlanToWatch;
        break;
      case 'on_hold':
        color = '#8b5cf6';
        label = t.statusOnHold;
        break;
      case 'dropped':
        color = '#ef4444';
        label = t.statusDropped;
        break;
    }

    return { color, label };
  }, [trackedShows, trackedMovies, trackedBooks, trackedManga, searchType, t]);

  const navigateToDetails = useCallback((item: MultiSearchResult | Book | Manga) => {
    if (searchType === 'tv_movie') {
      const i = item as MultiSearchResult;
      if (i.media_type === 'tv') router.push(`/show/${i.id}` as any);
      else if (i.media_type === 'movie') router.push(`/movie/${i.id}` as any);
    } else if (searchType === 'book') {
      const b = item as Book;
      router.push(`/book/${b.id}` as any);
    } else if (searchType === 'manga') {
      const m = item as Manga;
      router.push(`/manga/${m.id}` as any);
    }
  }, [router, searchType]);

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  // Helper function to check if item is upcoming
  const isUpcoming = useCallback((item: MultiSearchResult): boolean => {
    if (searchType !== 'tv_movie') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (item.media_type === 'tv' && item.first_air_date) {
      const airDate = new Date(item.first_air_date);
      airDate.setHours(0, 0, 0, 0);
      return airDate >= today;
    } else if (item.media_type === 'movie' && item.release_date) {
      const releaseDate = new Date(item.release_date);
      releaseDate.setHours(0, 0, 0, 0);
      return releaseDate >= today;
    }
    return false;
  }, [searchType]);

  // Aggregate results
  const displayData = useMemo(() => {
    if (debouncedQuery.length < 2) {
      return searchType === 'tv_movie' ? (trending?.results || []) : [];
    }

    if (searchType === 'tv_movie') {
      let results = tmdbResults?.results?.filter(
        (item) => item.media_type === 'tv' || item.media_type === 'movie'
      ) || [];
      if (showUpcomingOnly) {
        results = results.filter(isUpcoming);
      }
      return results;
    } else if (searchType === 'book') {
      return bookResults || [];
    } else if (searchType === 'manga') {
      return mangaResults || [];
    }
    return [];
  }, [debouncedQuery, searchType, tmdbResults, bookResults, mangaResults, trending, showUpcomingOnly, isUpcoming]);

  const isLoading = useMemo(() => {
    if (debouncedQuery.length < 2) return false;
    if (searchType === 'tv_movie') return searchingTmdb || fetchingTmdb;
    if (searchType === 'book') return searchingBooks || fetchingBooks;
    if (searchType === 'manga') return searchingManga || fetchingManga;
    return false;
  }, [debouncedQuery, searchType, searchingTmdb, fetchingTmdb, searchingBooks, fetchingBooks, searchingManga, fetchingManga]);

  const renderItem = useCallback(({ item }: { item: MultiSearchResult | Book | Manga }) => {
    let title: string = '';
    let posterUrl: string | null = null;
    let overview: string | undefined = '';
    let dateStr: string | undefined = '';
    let rating: number | undefined;
    let badgeText: string | undefined;

    // Type guards/Casting
    if (searchType === 'tv_movie') {
      const i = item as MultiSearchResult;
      title = i.name || i.title || '';
      posterUrl = getPosterUrl(i.poster_path, 'small');
      overview = i.overview;
      dateStr = i.first_air_date || i.release_date;
      rating = i.vote_average;
      badgeText = i.media_type === 'tv' ? t.tvBadge : t.movieBadge;
    } else if (searchType === 'book') {
      const b = item as Book;
      title = b.title;
      posterUrl = b.imageLinks?.thumbnail || null;
      overview = b.description;
      dateStr = b.publishedDate;
      rating = b.averageRating;
      badgeText = t.bookBadge;
    } else if (searchType === 'manga') {
      const m = item as Manga;
      title = m.title.english || m.title.romaji || m.title.native || '';
      posterUrl = m.coverImage?.medium || m.coverImage?.large || null;
      // Strip HTML from description if present (simple regex)
      overview = m.description?.replace(/<[^>]*>?/gm, '');
      dateStr = m.startDate?.year ? `${m.startDate.year}` : undefined;
      rating = m.averageScore ? m.averageScore / 10 : undefined; // Convert 0-100 to 0-10
      badgeText = t.mangaBadge;
    }

    const date = dateStr ? new Date(dateStr) : null;
    const isFutureDate = date && date >= new Date(new Date().setHours(0, 0, 0, 0));
    const statusInfo = getStatusInfo(item);
    // Upcoming logic only for TV/Movie
    const upcoming = searchType === 'tv_movie' && isUpcoming(item as MultiSearchResult);

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigateToDetails(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ 
            uri: posterUrl || 'https://via.placeholder.com/92x138/1a1a1a/666666?text=No+Image' 
          }}
          style={styles.resultPoster}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <View style={styles.resultHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {upcoming && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>{t.upcomingBadge}</Text>
                  </View>
                )}
                {statusInfo && (
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                  </View>
                )}
              </View>
            </View>
            {badgeText && (
               <View style={styles.mediaTypeBadge}>
                <Text style={styles.mediaTypeBadgeText}>{badgeText}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.dateContainer}>
             {isFutureDate && searchType === 'tv_movie' ? (
                <>
                  <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                  <Text style={styles.resultDateUpcoming}>
                    {(item as MultiSearchResult).media_type === 'tv' ? t.airDate : t.releaseDate}
                    {getFormattedDate(date)}
                  </Text>
                </>
              ) : (dateStr ? (
                <Text style={styles.resultYear}>
                   {date?.getFullYear() || dateStr}
                </Text>
              ) : null)}
          </View>
          
          <Text style={styles.resultOverview} numberOfLines={2}>
            {overview || t.noDesc}
          </Text>
          
          <View style={styles.resultMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {typeof rating === 'number' ? rating.toFixed(1) : 'N/A'}
              </Text>
            </View>
             {searchType === 'book' && (item as Book).authors && (
                <Text style={[styles.ratingText, { marginLeft: 8, color: Colors.textSecondary }]} numberOfLines={1}>
                  by {(item as Book).authors?.join(', ')}
                </Text>
             )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }, [navigateToDetails, isUpcoming, searchType, getStatusInfo, getFormattedDate, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.search}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={
                searchType === 'tv_movie' ? t.searchPlaceholder :
                searchType === 'book' ? t.search + ' ' + t.books :
                t.search + ' ' + t.manga
            }
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, searchType === 'tv_movie' && styles.tabActive]}
                onPress={() => setSearchType('tv_movie')}
            >
                <Text style={[styles.tabText, searchType === 'tv_movie' && styles.tabTextActive]}>TV & Movies</Text>
            </TouchableOpacity>
            {showBooks && (
            <TouchableOpacity 
                style={[styles.tab, searchType === 'book' && styles.tabActive]}
                onPress={() => setSearchType('book')}
            >
                <Text style={[styles.tabText, searchType === 'book' && styles.tabTextActive]}>{t.books}</Text>
            </TouchableOpacity>
            )}
            {showManga && (
             <TouchableOpacity 
                style={[styles.tab, searchType === 'manga' && styles.tabActive]}
                onPress={() => setSearchType('manga')}
            >
                <Text style={[styles.tabText, searchType === 'manga' && styles.tabTextActive]}>{t.manga}</Text>
            </TouchableOpacity>
            )}
        </View>

        {/* Upcoming Filter Toggle (Only for TV/Movie) */}
        {debouncedQuery.length >= 2 && searchType === 'tv_movie' && (
          <TouchableOpacity
            style={[styles.filterButton, showUpcomingOnly && styles.filterButtonActive]}
            onPress={() => setShowUpcomingOnly(!showUpcomingOnly)}
          >
            <Ionicons 
              name={showUpcomingOnly ? "checkmark-circle" : "calendar-outline"} 
              size={16} 
              color={showUpcomingOnly ? Colors.text : Colors.textSecondary} 
            />
            <Text style={[styles.filterButtonText, showUpcomingOnly && styles.filterButtonTextActive]}>
              {t.upcomingOnly}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t.searching}</Text>
        </View>
      ) : (
        <FlatList
          data={displayData as any[]}
          keyExtractor={(item) => {
              if (searchType === 'tv_movie') return `${(item as MultiSearchResult).media_type}-${item.id}`;
              return item.id.toString();
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            debouncedQuery.length < 2 && searchType === 'tv_movie' && trending?.results?.length ? (
              <Text style={styles.sectionTitle}>{t.trendingToday}</Text>
            ) : null
          }
          ListEmptyComponent={
            debouncedQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {showUpcomingOnly ? t.noUpcomingResults : t.noResults}
                </Text>
                <Text style={styles.emptySubtext}>
                  {showUpcomingOnly 
                    ? t.noUpcomingTip
                    : t.noResultsTip}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name={searchType === 'book' ? "book-outline" : searchType === 'manga' ? "book-outline" : "tv-outline"} size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>{t.findFavorites}</Text>
                <Text style={styles.emptySubtext}>
                  {t.searchTip}
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 10,
  },
  tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
  },
  tabActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
  },
  tabText: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '600',
  },
  tabTextActive: {
      color: Colors.text,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  resultPoster: {
    width: 70,
    height: 105,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
    gap: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  upcomingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.text,
  },
  mediaTypeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeBadgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultYear: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  resultDateUpcoming: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultOverview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.text,
    textTransform: 'uppercase',
  },
});
