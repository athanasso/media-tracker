import { getPosterUrl } from '@/src/services/api/client';
import { TrackedShow } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UpcomingShowItemProps {
    item: TrackedShow & { airDate: string; next_episode_to_air?: any };
    hasNotification: (id: number, type: 'show' | 'movie') => boolean;
    getFormattedDate: (date: string) => string;
    t: any;
    onNotificationPress: (id: number, type: 'show' | 'movie', name: string, date: string) => void;
    onRemove: (id: number) => void;
}

const Colors = {
    primary: '#E50914',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    surface: '#1a1a1a',
    surfaceLight: '#2a2a2a',
};

const UpcomingShowItem = memo(({ 
    item, 
    hasNotification, 
    getFormattedDate,
    t,
    onNotificationPress,
    onRemove
}: UpcomingShowItemProps) => {
    const router = useRouter();
    const nextEpisode = item.next_episode_to_air;
    const date = nextEpisode?.air_date || item.airDate;
    
    if (!date) return null;

    const hasNotif = hasNotification(item.showId, 'show');

    return (
      <TouchableOpacity 
        style={styles.itemCard} 
        onPress={() => {
            Haptics.selectionAsync();
            router.push(`/show/${item.showId}`);
        }}
      >
        <Image
          source={{ uri: getPosterUrl(item.posterPath, 'small') || '' }}
          style={styles.itemPoster}
          contentFit="cover"
          transition={500}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.showName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.statusText}>
              {nextEpisode 
                ? `${t.season.substring(0, 1)}:${nextEpisode.season_number} ${t.episodeN.replace('{number}', nextEpisode.episode_number.toString())}` 
                : t.upcoming}
            </Text>
          </View>
          <Text style={styles.progressText}>
             {getFormattedDate(date)}
          </Text>
          {hasNotif && (
            <Text style={styles.notificationText}>
              <Ionicons name="notifications" size={10} /> {t.notify}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onNotificationPress(item.showId, 'show', item.showName, date);
          }}
        >
          <Ionicons 
            name={hasNotif ? "notifications" : "notifications-outline"} 
            size={24} 
            color={hasNotif ? Colors.primary : Colors.textSecondary} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(t.removeConfirm, '', [{ text: t.cancel }, { text: t.remove, onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onRemove(item.showId);
              }}]);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
      </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
  itemCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center' },
  itemPoster: { width: 60, height: 90, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  itemInfo: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: Colors.text },
  progressText: { fontSize: 12, color: Colors.textSecondary },
  notificationText: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  notificationButton: { padding: 4 },
});

export default UpcomingShowItem;
