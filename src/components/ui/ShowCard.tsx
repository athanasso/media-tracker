/**
 * ShowCard Component
 * Vertical poster card with progress overlay - NativeWind styled
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
  primary: '#F5C518',
  primaryDark: '#D4A817',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  success: '#22C55E',
};

interface ShowCardProps {
  id: number;
  name: string;
  posterPath: string | null;
  watchedEpisodes: number;
  totalEpisodes: number;
  year?: string;
  rating?: number;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 100, height: 150 },
  medium: { width: 130, height: 195 },
  large: { width: 160, height: 240 },
};

export function ShowCard({
  id,
  name,
  posterPath,
  watchedEpisodes,
  totalEpisodes,
  year,
  rating,
  onPress,
  size = 'medium',
}: ShowCardProps) {
  const dimensions = SIZES[size];
  const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
  const isComplete = watchedEpisodes >= totalEpisodes && totalEpisodes > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { width: dimensions.width }]}
    >
      {/* Poster Image */}
      <View style={[styles.posterContainer, { width: dimensions.width, height: dimensions.height }]}>
        <Image
          source={{
            uri: getPosterUrl(posterPath, size === 'large' ? 'large' : 'medium') ||
                 'https://via.placeholder.com/300x450/1E1E1E/666666?text=No+Image',
          }}
          style={styles.posterImage}
          resizeMode="cover"
        />

        {/* Gradient Overlay at Bottom */}
        <View style={styles.gradientOverlay} />

        {/* Progress Bar Overlay */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: isComplete ? Colors.success : Colors.primary,
                },
              ]}
            />
          </View>
          <View style={styles.progressTextContainer}>
            {isComplete ? (
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
            ) : null}
            <Text style={styles.progressText}>
              {watchedEpisodes}/{totalEpisodes}
            </Text>
          </View>
        </View>

        {/* Rating Badge */}
        {rating !== undefined && rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color={Colors.primary} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Title & Year */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        {year && (
          <Text style={styles.year}>{year}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  posterContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  progressBackground: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  year: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default ShowCard;
