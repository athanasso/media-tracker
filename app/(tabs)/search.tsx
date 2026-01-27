/**
 * Search Screen
 * Search for TV shows and movies using TMDB API
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

import { getTrendingAll, searchMulti } from '@/src/services/api';
import { getPosterUrl } from '@/src/services/api/client';
import { useSettingsStore } from '@/src/store';
import { MultiSearchResult } from '@/src/types';

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

export default function SearchScreen() {
  const router = useRouter();
  const getFormattedDate = useSettingsStore(state => state.getFormattedDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const debouncedQuery = useDebouncedValue(searchQuery, 500);

  // Search query
  const {
    data: searchResults,
    isLoading: searching,
    isFetching,
  } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Trending for empty state
  const { data: trending } = useQuery({
    queryKey: ['trending', 'all', 'day'],
    queryFn: () => getTrendingAll('day'),
    enabled: debouncedQuery.length < 2,
  });

  const navigateToDetails = useCallback((item: MultiSearchResult) => {
    if (item.media_type === 'tv') {
      router.push(`/show/${item.id}`);
    } else if (item.media_type === 'movie') {
      router.push(`/movie/${item.id}`);
    }
  }, [router]);

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  // Helper function to check if item is upcoming
  const isUpcoming = useCallback((item: MultiSearchResult): boolean => {
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
  }, []);

  // Filter results
  const filteredResults = useMemo(() => {
    let results = searchResults?.results?.filter(
      (item) => item.media_type === 'tv' || item.media_type === 'movie'
    ) || [];

    // Apply upcoming filter if enabled
    if (showUpcomingOnly) {
      results = results.filter(isUpcoming);
    }

    return results;
  }, [searchResults?.results, showUpcomingOnly, isUpcoming]);

  const displayData = debouncedQuery.length >= 2 
    ? filteredResults 
    : trending?.results;

  const renderItem = useCallback(({ item }: { item: MultiSearchResult }) => {
    const upcoming = isUpcoming(item);
    const dateStr = item.first_air_date || item.release_date;
    const date = dateStr ? new Date(dateStr) : null;
    const isFutureDate = date && date >= new Date(new Date().setHours(0, 0, 0, 0));
    
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigateToDetails(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ 
            uri: getPosterUrl(item.poster_path, 'small') || 
                 'https://via.placeholder.com/92x138/1a1a1a/666666?text=No+Image' 
          }}
          style={styles.resultPoster}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <View style={styles.resultHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {item.name || item.title}
              </Text>
              {upcoming && (
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                </View>
              )}
            </View>
            <View style={styles.mediaTypeBadge}>
              <Text style={styles.mediaTypeBadgeText}>
                {item.media_type === 'tv' ? 'TV' : 'MOVIE'}
              </Text>
            </View>
          </View>
          
          {dateStr && (
            <View style={styles.dateContainer}>
              {isFutureDate ? (
                <>
                  <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                  <Text style={styles.resultDateUpcoming}>
                    {item.media_type === 'tv' ? 'Air Date: ' : 'Release Date: '}
                    {getFormattedDate(date)}
                  </Text>
                </>
              ) : (
                <Text style={styles.resultYear}>
                  {date?.getFullYear() || 'TBA'}
                </Text>
              )}
            </View>
          )}
          
          <Text style={styles.resultOverview} numberOfLines={2}>
            {item.overview || 'No description available.'}
          </Text>
          
          <View style={styles.resultMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.vote_average?.toFixed(1) || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }, [navigateToDetails, isUpcoming]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shows and movies..."
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
        {/* Upcoming Filter Toggle */}
        {debouncedQuery.length >= 2 && (
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
              Upcoming Only
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {(searching || isFetching) && debouncedQuery.length >= 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList<MultiSearchResult>
          data={(displayData as MultiSearchResult[]) || []}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            debouncedQuery.length < 2 && trending?.results?.length ? (
              <Text style={styles.sectionTitle}>🔥 Trending Today</Text>
            ) : null
          }
          ListEmptyComponent={
            debouncedQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {showUpcomingOnly ? 'No upcoming results found' : 'No results found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {showUpcomingOnly 
                    ? 'Try turning off the "Upcoming Only" filter or search for a different title'
                    : 'Try searching for a different title'}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="tv-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>Find your favorites</Text>
                <Text style={styles.emptySubtext}>
                  Search for TV shows and movies to track
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
});
