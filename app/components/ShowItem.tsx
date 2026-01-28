import { getPosterUrl } from '@/src/services/api/client';
import { useWatchlistStore } from '@/src/store';
import { TrackedShow, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Define Props for ShowItem
interface ShowItemProps {
    item: TrackedShow & { airDate?: string };
    activeTab: string;
    showsSubTab: string;
    hasNotification: (id: number, type: 'show' | 'movie') => boolean;
    getNotificationPreference: (id: number, type: 'show' | 'movie') => any; // Keep 'any' or refined type
    getStatusColor: (status: TrackingStatus) => string;
    getFormattedDate: (date: string) => string;
    t: any; // Localization strings object
    onStatusChange: (id: number, type: 'show' | 'movie', status: TrackingStatus) => void;
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

// Reused styles or we can import them if we export them from profile.tsx
// For simplicity, we'll accept a style object or inline the critical ones, 
// but to ensure matching look, we should ideally share styles.
// Since we are not fully refactoring styles out yet, we will rely on passed styles or recreate them.
// To keep it clean, let's assume parent passes no specific styles but relies on these components being
// styled via StyleSheet inside them matching the parent.

const ShowItem = memo(({ 
    item, 
    activeTab, 
    showsSubTab,
    hasNotification, 
    getNotificationPreference, 
    getStatusColor, 
    getFormattedDate,
    t,
    onStatusChange,
    onNotificationPress,
    onRemove
}: ShowItemProps) => {
    const router = useRouter();
    // Using store hook inside component for specific data
    const watchedCount = useWatchlistStore(state => state.getWatchedEpisodesCount(item.showId));

    const hasNotif = item.airDate ? hasNotification(item.showId, 'show') : false;
    const notifPref = item.airDate ? getNotificationPreference(item.showId, 'show') : undefined;

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
          <Text style={styles.itemTitle} numberOfLines={2}>{item.showName}</Text>
          <TouchableOpacity
            style={[
              styles.statusBadge, 
              { backgroundColor: (activeTab === 'shows' && showsSubTab === 'in_progress') ? '#3b82f6' : getStatusColor(item.status) }
            ]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onStatusChange(item.showId, 'show', item.status);
            }}
          >
            <Text style={styles.statusText}>
              {activeTab === 'shows' && showsSubTab === 'in_progress' ? t.inProgress :
               item.status === 'watching' ? t.statusWatching :
               item.status === 'completed' ? t.statusCompleted :
               item.status === 'plan_to_watch' ? t.statusPlanToWatch :
               item.status === 'on_hold' ? t.statusOnHold :
               item.status === 'dropped' ? t.statusDropped : item.status}
            </Text>
          </TouchableOpacity>
          {item.airDate ? (
            <>
              <Text style={styles.progressText}>{t.airDate}: {getFormattedDate(item.airDate)}</Text>
              {hasNotif && notifPref && (
                <Text style={styles.notificationText}>
                  🔔 {t.notify} {notifPref.timing} {t.before}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.progressText}>{watchedCount} {t.episodesWatched}</Text>
          )}
        </View>
        <View style={styles.itemActions}>
          {item.airDate && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onNotificationPress(item.showId, 'show', item.showName, item.airDate!);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(t.removeConfirm, '', [{ text: t.cancel }, { text: t.remove, onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onRemove(item.showId);
              }}]);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
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
  itemActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  notificationButton: { padding: 4 },
});

export default ShowItem;
