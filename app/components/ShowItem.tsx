import { getPosterUrl } from '@/src/services/api/client';
import { useWatchlistStore } from '@/src/store';
import { TrackedShow, TrackingStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';

// Define Props for ShowItem
interface ShowItemProps {
    item: TrackedShow & { 
        airDate?: string; 
        nextEpisode?: { seasonNumber: number; episodeNumber: number };
        remainingEpisodes?: number;
        numberOfEpisodes?: number;
        seasons?: { seasonNumber: number; episodeCount: number }[];
    };
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
    onMarkEpisodeWatched?: (showId: number, seasonNumber: number, episodeNumber: number) => void;
}

import { AppColors } from '@/src/theme/colors';

const Colors = AppColors;

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
    onRemove,
    onMarkEpisodeWatched
}: ShowItemProps) => {
    const router = useRouter();
    // Using store hook inside component for specific data
    const watchedCount = useWatchlistStore(state => state.getWatchedEpisodesCount(item.showId));

    const [isMarkingWatched, setIsMarkingWatched] = React.useState(false);
    
    // Reset loading state when the episode changes (meaning operation succeeded)
    React.useEffect(() => {
        setIsMarkingWatched(false);
    }, [item.nextEpisode?.seasonNumber, item.nextEpisode?.episodeNumber]);

    const hasNotif = (item.airDate && typeof hasNotification === 'function') ? hasNotification(item.showId, 'show') : false;
    const notifPref = (item.airDate && typeof getNotificationPreference === 'function') ? getNotificationPreference(item.showId, 'show') : undefined;

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
            <>
                <Text style={styles.progressText}>
                    {(() => {
                        const totalEpisodes = item.numberOfEpisodes || 0;
                        const lastWatched = [...item.watchedEpisodes].sort((a, b) => 
                            (a.seasonNumber - b.seasonNumber) || (a.episodeNumber - b.episodeNumber)
                        ).pop();
                        const { seasonNumber: currentSeason = 1, episodeNumber: currentEpNum = 0 } = lastWatched || {};

                        // Sum up all episodes from completed previous seasons (excluding specials)
                        const episodesFromPastSeasons = (item.seasons || [])
                            .filter(s => s.seasonNumber > 0 && s.seasonNumber < currentSeason)
                            .reduce((sum, s) => sum + (s.episodeCount || 0), 0);

                        // Total = past seasons + current season progress
                        let displayCount = episodesFromPastSeasons + currentEpNum;

                        // Fallback for simple numbering or missing season data
                        if (currentSeason === 1 || !item.seasons) {
                            displayCount = currentEpNum || watchedCount || 0;
                        }

                        // Clamp to total
                        const finalCount = totalEpisodes > 0 ? Math.min(displayCount, totalEpisodes) : displayCount;

                        return `${finalCount} ${t.episodesWatched}`;
                    })()}
                </Text>
                {activeTab === 'shows' && showsSubTab === 'in_progress' && (
                    <Text style={styles.remainingText}>
                        {item.remainingEpisodes !== undefined ? `${item.remainingEpisodes} ${t.left || 'left'}` : ''}
                        {item.remainingEpisodes !== undefined && item.nextEpisode ? ' • ' : ''}
                        {item.nextEpisode ? `S${item.nextEpisode.seasonNumber}E${item.nextEpisode.episodeNumber}` : ''}
                    </Text>
                )}
            </>
          )}
        </View>
        <View style={styles.itemActions}>
          {activeTab === 'shows' && showsSubTab === 'in_progress' && item.nextEpisode && onMarkEpisodeWatched && (
             <TouchableOpacity
               onPress={(e) => {
                 e.stopPropagation();
                 setIsMarkingWatched(true);
                 Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                 // Delay slightly to allow UI update before heavy store operation if sync
                 requestAnimationFrame(() => {
                    onMarkEpisodeWatched(item.showId, item.nextEpisode!.seasonNumber, item.nextEpisode!.episodeNumber);
                 });
               }}
               style={styles.actionButton}
               disabled={isMarkingWatched}
             >
               {isMarkingWatched ? (
                   <ActivityIndicator size="small" color={Colors.success} />
               ) : (
                   <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} />
               )}
             </TouchableOpacity>
          )}
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
  itemCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center', height: 114 },
  itemPoster: { width: 60, height: 90, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  itemInfo: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: Colors.text },
  progressText: { fontSize: 12, color: Colors.textSecondary },
  notificationText: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  notificationButton: { padding: 4 },
  actionButton: { padding: 4 },
  remainingText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});

export default ShowItem;
