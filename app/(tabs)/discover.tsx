/**
 * Discover Screen
 * Displays trending shows and movies in horizontal scroll sections
 */

import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/src/i18n/strings';
import {
  getPopularMovies,
  getPopularShows,
  getTrendingAll,
  getTrendingMovies,
  getTrendingShows,
} from '@/src/services/api';
import { getBackdropUrl, getPosterUrl } from '@/src/services/api/client';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { MovieListItem, ShowListItem, TrendingItem } from '@/src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = 130;
const POSTER_HEIGHT = 195;
const FEATURED_HEIGHT = 450;

// App colors
const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
};

export default function DiscoverScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const language = useSettingsStore((state) => state.language);
  const t = strings[language] || strings.en;

  // Store for adding to watchlist
  const { addShow, addMovie, isShowTracked, isMovieTracked } = useWatchlistStore();

  // Fetch trending content
  const { data: trendingAll, isLoading: loadingTrending, refetch: refetchTrending } = useQuery({
    queryKey: ['trending', 'all', 'week', language],
    queryFn: () => getTrendingAll('week'),
  });

  const { data: trendingShows, isLoading: loadingShows, refetch: refetchShows } = useQuery({
    queryKey: ['trending', 'tv', 'week', language],
    queryFn: () => getTrendingShows('week'),
  });

  const { data: trendingMovies, isLoading: loadingMovies, refetch: refetchMovies } = useQuery({
    queryKey: ['trending', 'movies', 'week', language],
    queryFn: () => getTrendingMovies('week'),
  });

  const { data: popularShows, refetch: refetchPopularShows } = useQuery({
    queryKey: ['popular', 'shows', language],
    queryFn: () => getPopularShows(),
  });

  const { data: popularMovies, refetch: refetchPopularMovies } = useQuery({
    queryKey: ['popular', 'movies', language],
    queryFn: () => getPopularMovies(),
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTrending(),
      refetchShows(),
      refetchMovies(),
      refetchPopularShows(),
      refetchPopularMovies(),
    ]);
    setRefreshing(false);
  }, [refetchTrending, refetchShows, refetchMovies, refetchPopularShows, refetchPopularMovies]);

  const navigateToDetails = (item: TrendingItem | ShowListItem | MovieListItem, type: 'tv' | 'movie') => {
    if (type === 'tv') {
      router.push(`/show/${item.id}`);
    } else {
      router.push(`/movie/${item.id}`);
    }
  };

  const handleAddToWatchlist = (item: TrendingItem) => {
    if (item.media_type === 'tv') {
      if (!isShowTracked(item.id)) {
        addShow({ showId: item.id, showName: item.name || '', posterPath: item.poster_path });
      }
    } else {
      if (!isMovieTracked(item.id)) {
        addMovie({ movieId: item.id, movieTitle: item.title || '', posterPath: item.poster_path });
      }
    }
  };

  const featuredItem = trendingAll?.results?.[0];
  const isFeaturedTracked = featuredItem 
    ? (featuredItem.media_type === 'tv' ? isShowTracked(featuredItem.id) : isMovieTracked(featuredItem.id))
    : false;

  if (loadingTrending && loadingShows && loadingMovies) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Media Tracker</Text>
        </View>

        {/* Featured Banner */}
        {featuredItem && (
          <TouchableOpacity
            style={styles.featuredContainer}
            onPress={() => navigateToDetails(featuredItem, featuredItem.media_type)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: getBackdropUrl(featuredItem.backdrop_path, 'large') || '' }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.8)', Colors.background]}
              style={styles.featuredGradient}
            />
            <View style={styles.featuredContent}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>
                  {featuredItem.media_type === 'tv' ? t.tvShow : t.movieCap}
                </Text>
              </View>
              <Text style={styles.featuredTitle}>
                {featuredItem.name || featuredItem.title}
              </Text>
              <Text style={styles.featuredOverview} numberOfLines={2}>
                {featuredItem.overview}
              </Text>
              <View style={styles.featuredActions}>
                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={() => navigateToDetails(featuredItem, featuredItem.media_type)}
                >
                  <Ionicons name="information-circle" size={20} color="#000" />
                  <Text style={styles.playButtonText}>{t.details}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addButton, isFeaturedTracked && styles.addedButton]}
                  onPress={() => handleAddToWatchlist(featuredItem)}
                >
                  <Ionicons name={isFeaturedTracked ? "checkmark" : "add"} size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Trending This Week */}
        <MediaRow
          title={t.trendingThisWeek}
          data={trendingAll?.results?.slice(1, 15)}
          onItemPress={(item) => navigateToDetails(item, (item as TrendingItem).media_type)}
          showMediaType
        />

        {/* Trending TV Shows */}
        <MediaRow
          title={t.trendingShows}
          data={trendingShows?.results}
          onItemPress={(item) => navigateToDetails(item, 'tv')}
        />

        {/* Trending Movies */}
        <MediaRow
          title={t.trendingMovies}
          data={trendingMovies?.results}
          onItemPress={(item) => navigateToDetails(item, 'movie')}
        />

        {/* Popular TV Shows */}
        <MediaRow
          title={t.popularShows}
          data={popularShows?.results}
          onItemPress={(item) => navigateToDetails(item, 'tv')}
        />

        {/* Popular Movies */}
        <MediaRow
          title={t.popularMovies}
          data={popularMovies?.results}
          onItemPress={(item) => navigateToDetails(item, 'movie')}
        />

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Media Row Component
interface MediaRowProps {
  title: string;
  data?: (TrendingItem | ShowListItem | MovieListItem)[];
  onItemPress: (item: TrendingItem | ShowListItem | MovieListItem) => void;
  showMediaType?: boolean;
}

function MediaRow({ title, data, onItemPress, showMediaType }: MediaRowProps) {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.posterContainer}
            onPress={() => onItemPress(item)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: getPosterUrl(item.poster_path, 'medium') || '' }}
              style={styles.posterImage}
              resizeMode="cover"
            />
            {showMediaType && 'media_type' in item && (
              <View style={styles.mediaTypeBadge}>
                <Text style={styles.mediaTypeBadgeText}>
                  {item.media_type === 'tv' ? 'TV' : 'MOVIE'}
                </Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.vote_average?.toFixed(1)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  // Featured styles
  featuredContainer: {
    height: FEATURED_HEIGHT,
    marginBottom: 20,
  },
  featuredImage: {
    width: SCREEN_WIDTH,
    height: FEATURED_HEIGHT,
    position: 'absolute',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FEATURED_HEIGHT * 0.7,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  featuredBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  featuredTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  featuredOverview: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  playButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedButton: {
    backgroundColor: Colors.primary,
  },
  // Section styles
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  rowContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  posterContainer: {
    width: POSTER_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  posterImage: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeBadgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
