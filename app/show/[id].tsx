/**
 * Show Details Screen
 * Displays full show info with backdrop, genres, cast, seasons selector, and episode tracking
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useShowDetails } from '@/src/hooks/useShowDetails';
import { strings } from '@/src/i18n/strings';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/src/services/api/client';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { CastMember, Episode, Genre } from '@/src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BACKDROP_HEIGHT = SCREEN_HEIGHT * 0.45;

// Theme colors
const Colors = {
  primary: '#E50914',
  primaryDark: '#B20710',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  surfaceElevated: '#333333',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',
  success: '#22c55e',
  successDark: '#16a34a',
  warning: '#f59e0b',
  border: '#3a3a3a',
  overlay: 'rgba(0,0,0,0.6)',
};

export default function ShowDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = parseInt(id, 10);
  const { getFormattedDate, language } = useSettingsStore();

  const t = strings[language] || strings.en;
  
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  // Fetch show and season data using custom hook
  const { show, season, isLoadingShow, isLoadingSeason, isError } = useShowDetails({
    showId,
    selectedSeason,
    enabled: !!showId,
  });

  // Subscribe to the actual state array to trigger re-renders
  const trackedShows = useWatchlistStore((state) => state.trackedShows);
  const addShow = useWatchlistStore((state) => state.addShow);
  const removeShow = useWatchlistStore((state) => state.removeShow);
  const markEpisodeWatched = useWatchlistStore((state) => state.markEpisodeWatched);
  const markEpisodeUnwatched = useWatchlistStore((state) => state.markEpisodeUnwatched);
  const markSeasonWatched = useWatchlistStore((state) => state.markSeasonWatched);

  // Derive tracking state from the subscribed array
  const trackedShow = trackedShows.find((s) => s.showId === showId);
  const isTracked = !!trackedShow;
  const watchedEpisodes = useMemo(() => trackedShow?.watchedEpisodes || [], [trackedShow?.watchedEpisodes]);
  const watchedCount = watchedEpisodes.length;

  // Helper function to check if episode is watched
  const checkEpisodeWatched = useCallback((seasonNum: number, episodeNum: number) => {
    return watchedEpisodes.some(
      (e) => e.seasonNumber === seasonNum && e.episodeNumber === episodeNum
    );
  }, [watchedEpisodes]);

  // Helper function to get season progress
  const getSeasonProgressValue = (seasonNum: number, totalEpisodes: number) => {
    if (totalEpisodes === 0) return 0;
    const watchedInSeason = watchedEpisodes.filter((e) => e.seasonNumber === seasonNum).length;
    return Math.round((watchedInSeason / totalEpisodes) * 100);
  };

  // Toggle show tracking
  const handleToggleTracking = useCallback(() => {
    if (isTracked) {
      removeShow(showId);
    } else if (show) {
      addShow({
        showId,
        showName: show.name,
        posterPath: show.poster_path,
      });
    }
  }, [isTracked, showId, show, addShow, removeShow]);

  // Toggle episode watched state
  const handleToggleEpisode = useCallback((episode: Episode) => {
    // Auto-add show to tracking if not tracked
    if (!isTracked && show) {
      addShow({
        showId,
        showName: show.name,
        posterPath: show.poster_path,
      });
    }

    if (checkEpisodeWatched(episode.season_number, episode.episode_number)) {
      markEpisodeUnwatched(showId, episode.season_number, episode.episode_number);
    } else {
      markEpisodeWatched({
        showId,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        episodeId: episode.id,
      });
    }
  }, [isTracked, show, showId, markEpisodeWatched, markEpisodeUnwatched, addShow, checkEpisodeWatched]);

  // Mark all episodes in season as watched
  const handleMarkSeasonWatched = useCallback(() => {
    if (!season?.episodes || !show) return;

    // Auto-add show to tracking if not tracked
    if (!isTracked) {
      addShow({
        showId,
        showName: show.name,
        posterPath: show.poster_path,
      });
    }

    const episodesToMark = season.episodes.map((ep) => ({
      showId,
      seasonNumber: ep.season_number,
      episodeNumber: ep.episode_number,
      episodeId: ep.id,
    }));

    markSeasonWatched(showId, selectedSeason, episodesToMark);
  }, [season, show, showId, selectedSeason, isTracked, addShow, markSeasonWatched]);

  // Loading state
  if (isLoadingShow) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t.loadingShow}</Text>
      </View>
    );
  }

  // Error state
  if (isError || !show) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.errorText}>{t.failedLoadShow}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>{t.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extract data
  const releaseYear = show.first_air_date?.split('-')[0] || 'TBA';
  const endYear = show.status === 'Ended' ? show.last_air_date?.split('-')[0] : t.present;
  const genres = show.genres || [];
  const cast = show.credits?.cast?.slice(0, 10) || [];
  const seasons = show.seasons?.filter((s) => s.season_number > 0) || [];
  const episodes = season?.episodes || [];
  const seasonProgress = getSeasonProgressValue(selectedSeason, episodes.length);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: '',
          headerTransparent: true,
          headerTintColor: Colors.text,
        }} 
      />
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ===== BACKDROP HEADER ===== */}
        <View style={styles.backdropContainer}>
          <Image
            source={{ uri: getBackdropUrl(show.backdrop_path, 'large') || '' }}
            style={styles.backdropImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.4)', 'rgba(10,10,10,0.9)', Colors.background]}
            locations={[0, 0.4, 0.7, 1]}
            style={styles.backdropGradient}
          />
          
          {/* Poster and Title Overlay */}
          <View style={styles.headerContent}>
            <Image
              source={{ uri: getPosterUrl(show.poster_path, 'medium') || '' }}
              style={styles.posterImage}
              resizeMode="cover"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.showTitle} numberOfLines={3}>
                {show.name}
              </Text>
              <Text style={styles.showMeta}>
                {releaseYear} - {endYear} • {show.number_of_seasons} {show.number_of_seasons !== 1 ? t.seasons : t.season}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{show.vote_average?.toFixed(1)}</Text>
                <Text style={styles.voteCount}>({show.vote_count?.toLocaleString()} {t.votes})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== GENRE TAGS ===== */}
        {genres.length > 0 && (
          <View style={styles.genreContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScroll}>
              {genres.map((genre: Genre) => (
                <View key={genre.id} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, isTracked && styles.trackedButton]}
            onPress={handleToggleTracking}
          >
            <Ionicons name={isTracked ? "checkmark" : "add"} size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>
              {isTracked ? t.untrackShow : t.trackShow}
            </Text>
          </TouchableOpacity>
          
          {isTracked && watchedCount > 0 && (
            <View style={styles.progressBadge}>
              <Ionicons name="eye" size={14} color={Colors.success} />
              <Text style={styles.progressBadgeText}>{watchedCount} watched</Text>
            </View>
          )}
        </View>

        {/* ===== SUMMARY ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.overview}</Text>
          <Text style={styles.overview} numberOfLines={isOverviewExpanded ? undefined : 4}>
            {show.overview || t.noDesc}
          </Text>
        </View>

        {/* ===== CAST ===== */}
        {cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.topCast}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.castScroll}
            >
              {cast.map((member: CastMember) => (
                <View key={member.credit_id} style={styles.castCard}>
                  <Image
                    source={{ 
                      uri: getProfileUrl(member.profile_path, 'medium') || 
                           'https://via.placeholder.com/185x278/1a1a1a/666666?text=No+Photo'
                    }}
                    style={styles.castImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.castName} numberOfLines={1}>{member.name}</Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>{member.character}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== SEASONS SELECTOR ===== */}
        {seasons.length > 0 && (
          <View style={styles.seasonSection}>
          <View style={styles.seasonHeader}>
            <Text style={styles.sectionTitle}>{t.seasons}</Text>
            {seasonProgress === 100 && (
              <View style={styles.seasonBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.seasonBadgeText}>{t.watched}</Text>
              </View>
            )}
          </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.seasonScroll}
            >
              {seasons.map((s) => {
                const progress = getSeasonProgressValue(s.season_number, s.episode_count);
                const isSelected = selectedSeason === s.season_number;
                
                return (
                  <TouchableOpacity
                key={s.id}
                style={[styles.seasonChip, selectedSeason === s.season_number && styles.seasonChipActive]}
                onPress={() => setSelectedSeason(s.season_number)}
              >
                <Text style={[styles.seasonChipText, selectedSeason === s.season_number && styles.seasonChipTextActive]}>
                  {t.season} {s.season_number}
                </Text>
              </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ===== EPISODES LIST ===== */}
        <View style={styles.section}>
              <View style={styles.episodesHeader}>
                <Text style={styles.episodesTitle}>
                  {t.episodes} ({episodes.length})
                </Text>
                
                {seasonProgress < 100 && (
                  <TouchableOpacity 
                    style={styles.markSeasonButton}
                    onPress={() => markSeasonWatched(showId, selectedSeason, episodes.map(e => ({
                      showId,
                      seasonNumber: selectedSeason,
                      episodeNumber: e.episode_number,
                      episodeId: e.id,
                      watchedAt: new Date().toISOString() // Assuming current time, store will handle it
                    })))}
                  >
                    <Text style={styles.markSeasonText}>{t.markSeasonWatched}</Text>
                  </TouchableOpacity>
                )}
              </View>

          {isLoadingSeason ? (
            <View style={styles.episodesLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
            </View>
          ) : episodes.length === 0 ? (
            <View style={styles.noEpisodes}>
              <Ionicons name="film-outline" size={40} color={Colors.textSecondary} />
              <Text style={styles.noEpisodesText}>No episodes available</Text>
            </View>
          ) : (
            <View style={styles.episodesList}>
              {episodes.map((episode: Episode) => {
                const isWatched = checkEpisodeWatched(episode.season_number, episode.episode_number);
                const hasAired = episode.air_date ? new Date(episode.air_date) <= new Date() : false;
                
                return (
                  <Pressable
                    key={episode.id}
                    style={({ pressed }) => [
                      styles.episodeCard,
                      pressed && styles.episodeCardPressed,
                      isWatched && styles.episodeCardWatched,
                    ]}
                    onPress={() => hasAired && handleToggleEpisode(episode)}
                    disabled={!hasAired}
                  >
                    {/* Episode Thumbnail */}
                    <View style={styles.episodeMain}>
                    <View style={styles.episodeNumber}>
                      <Text style={styles.episodeNumberText}>{episode.episode_number}</Text>
                    </View>
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeTitle}>{episode.name}</Text>
                      {episode.air_date && (
                        <Text style={styles.episodeDate}>{getFormattedDate(episode.air_date)}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.watchedCheckbox,
                        isWatched && styles.watchedCheckboxActive,
                        !hasAired && styles.watchedCheckboxDisabled,
                      ]}
                      onPress={() => hasAired && handleToggleEpisode(episode)}
                      disabled={!hasAired}
                      activeOpacity={0.7}
                    >
                      {isWatched ? (
                        <Ionicons name="checkmark" size={18} color={Colors.text} />
                      ) : (
                        <View style={styles.checkboxEmpty} />
                      )}
                    </TouchableOpacity>
                  </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  errorText: {
    color: Colors.text,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Backdrop Header
  backdropContainer: {
    height: BACKDROP_HEIGHT,
    position: 'relative',
  },
  backdropImage: {
    width: SCREEN_WIDTH,
    height: BACKDROP_HEIGHT,
    position: 'absolute',
  },
  backdropGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  posterImage: {
    width: 110,
    height: 165,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  headerInfo: {
    flex: 1,
    paddingBottom: 8,
  },
  showTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  showMeta: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 2,
  },
  voteCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Genre Tags
  genreContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  genreScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreTag: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genreText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    maxWidth: 200,
  },
  actionButtonActive: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },

  // Summary
  summaryText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Cast
  castContainer: {
    gap: 14,
  },
  castCard: {
    width: 90,
    alignItems: 'center',
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  castName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  castCharacter: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  overview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  
  // Seasons
  seasonSection: {
    marginBottom: 24,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seasonBadgeText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },
  seasonScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  seasonChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  seasonChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  seasonChipTextActive: {
    color: Colors.text,
  },

  // Episodes
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  episodesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  markSeasonButton: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  markSeasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  episodesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  episodesLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noEpisodes: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEpisodesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  episodesList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  episodeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  episodeCardPressed: {
    opacity: 0.8,
  },
  episodeCardWatched: {
    backgroundColor: Colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  episodeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  episodeNumber: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
  },
  episodeNumberText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  episodeDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  episodeOverview: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // Watched Checkbox
  watchedCheckbox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
  },
  watchedCheckboxActive: {
    backgroundColor: Colors.success,
  },
  watchedCheckboxDisabled: {
    backgroundColor: Colors.surface,
    opacity: 0.5,
  },
  checkboxEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textMuted,
  },
  trackedButton: {
    backgroundColor: Colors.success,
  },
  castScroll: {
    gap: 12,
  },
});
