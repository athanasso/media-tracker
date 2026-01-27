import { getPosterUrl } from '@/src/services/api/client';
import { TrackedMovie, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MovieItemProps {
    item: TrackedMovie & { releaseDate?: string };
    activeTab: string;
    moviesSubTab: string;
    hasNotification: (id: number, type: 'show' | 'movie') => boolean;
    getNotificationPreference: (id: number, type: 'show' | 'movie') => any;
    getStatusColor: (status: TrackingStatus) => string;
    getFormattedDate: (date: string) => string;
    t: any;
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

const MovieItem = memo(({ 
    item, 
    activeTab, 
    moviesSubTab,
    hasNotification, 
    getNotificationPreference, 
    getStatusColor, 
    getFormattedDate,
    t,
    onStatusChange,
    onNotificationPress,
    onRemove
}: MovieItemProps) => {
    const router = useRouter();
    const hasNotif = item.releaseDate ? hasNotification(item.movieId, 'movie') : false;
    const notifPref = item.releaseDate ? getNotificationPreference(item.movieId, 'movie') : undefined;

    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/movie/${item.movieId}`)}>
        <Image source={{ uri: getPosterUrl(item.posterPath, 'small') || '' }} style={styles.itemPoster} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.movieTitle}</Text>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
            onPress={() => onStatusChange(item.movieId, 'movie', item.status)}
          >
            <Text style={styles.statusText}>
              {(activeTab === 'movies' && moviesSubTab === 'upcoming') ? t.upcoming :
               item.status === 'watching' ? t.statusWatching :
               item.status === 'completed' ? t.statusCompleted :
               item.status === 'plan_to_watch' ? t.statusPlanToWatch :
               item.status === 'on_hold' ? t.statusOnHold :
               item.status === 'dropped' ? t.statusDropped : item.status}
            </Text>
          </TouchableOpacity>
          {item.releaseDate ? (
            <>
              <Text style={styles.progressText}>{t.releaseDate}: {getFormattedDate(item.releaseDate)}</Text>
              {hasNotif && notifPref && (
                <Text style={styles.notificationText}>
                  🔔 {t.notify} {notifPref.timing} {t.before}
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
                onNotificationPress(item.movieId, 'movie', item.movieTitle, item.releaseDate!);
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
              Alert.alert(t.removeConfirm, '', [{ text: t.cancel }, { text: t.remove, onPress: () => onRemove(item.movieId) }]);
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

export default MovieItem;
