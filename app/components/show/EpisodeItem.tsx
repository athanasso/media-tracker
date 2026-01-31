import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/src/theme/colors';
import { Episode } from '@/src/types';

interface EpisodeItemProps {
  episode: Episode;
  isWatched: boolean;
  hasAired: boolean;
  onToggle: (episode: Episode) => void;
  onLongPress: (episode: Episode) => void;
  getFormattedDate: (date: string) => string;
}

const Colors = AppColors;

export const EpisodeItem = memo(({ 
  episode, 
  isWatched, 
  hasAired, 
  onToggle, 
  onLongPress,
  getFormattedDate 
}: EpisodeItemProps) => {
  return (
    <Pressable
        style={({ pressed }) => [
        styles.episodeCard,
        pressed && styles.episodeCardPressed,
        isWatched && styles.episodeCardWatched,
        { height: 80 }
        ]}
        onPress={() => hasAired && onToggle(episode)}
        onLongPress={() => hasAired && onLongPress(episode)}
        delayLongPress={500}
        disabled={!hasAired}
    >
        <View style={styles.episodeMain}>
            <View style={styles.episodeNumber}>
            <Text style={styles.episodeNumberText}>{episode.episode_number}</Text>
            </View>
            <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={1}>{episode.name}</Text>
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
            onPress={() => hasAired && onToggle(episode)}
            disabled={!hasAired}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
});

const styles = StyleSheet.create({
  episodeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginBottom: 8,
  },
  episodeCardPressed: {
    opacity: 0.8,
  },
  episodeCardWatched: {
    backgroundColor: Colors.surfaceLight,
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
});

export default EpisodeItem;
