/**
 * ProgressRow Component
 * Horizontal row showing show/movie with progress - NativeWind styled
 */

import { getPosterUrl } from '@/src/services/api/client';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Theme colors matching Tailwind config
const Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  surfaceElevated: '#333333',
  primary: '#F5C518',
  primaryDark: '#D4A817',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  success: '#22C55E',
  border: '#3A3A3A',
};

interface ProgressRowProps {
  id: number;
  name: string;
  posterPath: string | null;
  watchedEpisodes: number;
  totalEpisodes: number;
  currentSeason?: number;
  nextEpisode?: string;
  lastWatched?: string;
  status?: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  onPress?: () => void;
  onPlayPress?: () => void;
}

export function ProgressRow({
  id,
  name,
  posterPath,
  watchedEpisodes,
  totalEpisodes,
  currentSeason,
  nextEpisode,
  lastWatched,
  status = 'watching',
  onPress,
  onPlayPress,
}: ProgressRowProps) {
  const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
  const isComplete = watchedEpisodes >= totalEpisodes && totalEpisodes > 0;
  const remaining = totalEpisodes - watchedEpisodes;

  const getStatusColor = () => {
    switch (status) {
      case 'watching': return Colors.success;
      case 'completed': return '#3B82F6';
      case 'plan_to_watch': return Colors.primary;
      case 'on_hold': return '#8B5CF6';
      case 'dropped': return '#EF4444';
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'watching': return 'Watching';
      case 'completed': return 'Completed';
      case 'plan_to_watch': return 'Plan to Watch';
      case 'on_hold': return 'On Hold';
      case 'dropped': return 'Dropped';
      default: return '';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      {/* Poster Thumbnail */}
      <View style={styles.posterContainer}>
        <Image
          source={{
            uri: getPosterUrl(posterPath, 'small') ||
                 'https://via.placeholder.com/185x278/1E1E1E/666666?text=No+Image',
          }}
          style={styles.posterImage}
          resizeMode="cover"
        />
        {/* Mini Progress Indicator */}
        <View style={styles.miniProgress}>
          <View
            style={[
              styles.miniProgressFill,
              {
                height: `${Math.min(progress, 100)}%`,
                backgroundColor: isComplete ? Colors.success : Colors.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title Row */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </View>

        {/* Progress Info */}
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            <Text style={styles.progressHighlight}>{watchedEpisodes}</Text>
            <Text style={styles.progressDivider}> / </Text>
            <Text>{totalEpisodes} episodes</Text>
          </Text>
          {currentSeason && (
            <Text style={styles.seasonText}>• Season {currentSeason}</Text>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: isComplete ? Colors.success : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.percentText}>{Math.round(progress)}%</Text>
        </View>

        {/* Next Episode or Remaining */}
        <View style={styles.bottomRow}>
          {isComplete ? (
            <View style={styles.completeRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.completeText}>All episodes watched</Text>
            </View>
          ) : nextEpisode ? (
            <Text style={styles.nextEpisode} numberOfLines={1}>
              Next: {nextEpisode}
            </Text>
          ) : remaining > 0 ? (
            <Text style={styles.remainingText}>
              {remaining} episode{remaining !== 1 ? 's' : ''} remaining
            </Text>
          ) : null}

          {lastWatched && (
            <Text style={styles.lastWatched}>{lastWatched}</Text>
          )}
        </View>
      </View>

      {/* Play/Continue Button */}
      {!isComplete && onPlayPress && (
        <TouchableOpacity
          onPress={onPlayPress}
          style={styles.playButton}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={18} color={Colors.background} />
        </TouchableOpacity>
      )}

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  posterContainer: {
    width: 55,
    height: 82,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  miniProgress: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'flex-end',
  },
  miniProgressFill: {
    width: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  progressDivider: {
    color: Colors.textMuted,
  },
  seasonText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completeText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  nextEpisode: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
  },
  remainingText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  lastWatched: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
});

export default ProgressRow;
