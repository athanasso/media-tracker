import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/src/i18n/strings';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackingStatus } from '@/src/types';

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  error: '#ef4444',
};

type StatTab = 'shows' | 'movies' | 'episodes';

export default function StatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: StatTab }>();
  const [activeTab, setActiveTab] = useState<StatTab>(params.type || 'shows');
  
  const { language } = useSettingsStore();
  const t = strings[language] || strings.en;
  
  const { trackedShows, trackedMovies } = useWatchlistStore();

  // --- Calculations ---

  const formatTime = (minutes: number) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days} ${t.days}`);
    if (hours > 0) parts.push(`${hours} ${t.hours}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} ${t.minutes}`);
    
    return parts.join(' ');
  };

  const showStats = useMemo(() => {
    const total = trackedShows.length;
    const byStatus = trackedShows.reduce((acc, show) => {
      acc[show.status] = (acc[show.status] || 0) + 1;
      return acc;
    }, {} as Record<TrackingStatus, number>);

    // Time Spent (approximate using average of episode run times or default 45m)
    const timeSpent = trackedShows.reduce((acc, show) => {
      const avgRuntime = show.episodeRunTime && show.episodeRunTime.length > 0 
        ? show.episodeRunTime.reduce((a, b) => a + b, 0) / show.episodeRunTime.length 
        : 45;
      return acc + (show.watchedEpisodes.length * avgRuntime);
    }, 0);

    return { total, byStatus, timeSpent };
  }, [trackedShows]);

  const movieStats = useMemo(() => {
    const total = trackedMovies.length;
    const byStatus = trackedMovies.reduce((acc, movie) => {
      acc[movie.status] = (acc[movie.status] || 0) + 1;
      return acc;
    }, {} as Record<TrackingStatus, number>);

    // Time Spent
    const timeSpent = trackedMovies.reduce((acc, movie) => {
        // Count if status is completed OR watchedAt is present
        // Use fall back runtime of 120 minutes if unknown (common for imports)
        if (movie.status === 'completed' || movie.status === 'watching' || movie.watchedAt) {
            return acc + (movie.runtime || 120);
        }
        return acc;
    }, 0);

    return { total, byStatus, timeSpent };
  }, [trackedMovies]);

  const episodeStats = useMemo(() => {
    // Total episodes watched across all shows
    const totalWatched = trackedShows.reduce(
      (acc, show) => acc + show.watchedEpisodes.length, 
      0
    );

    // Shows with most watched episodes
    const topShows = [...trackedShows]
      .sort((a, b) => b.watchedEpisodes.length - a.watchedEpisodes.length)
      .slice(0, 5)
      .map(s => ({ name: s.showName, count: s.watchedEpisodes.length }));

    return { totalWatched, topShows };
  }, [trackedShows]);

  // --- Render Helpers ---

  const getStatusColor = (status: TrackingStatus) => {
    switch (status) {
      case 'watching': return Colors.success;
      case 'completed': return Colors.info;
      case 'plan_to_watch': return Colors.warning;
      case 'on_hold': return Colors.purple;
      case 'dropped': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: TrackingStatus) => {
    switch (status) {
        case 'watching': return t.statusWatching;
        case 'completed': return t.statusCompleted;
        case 'plan_to_watch': return t.statusPlanToWatch;
        case 'on_hold': return t.statusOnHold;
        case 'dropped': return t.statusDropped;
        default: return status;
    }
  };

  const renderStatusGraph = (total: number, byStatus: Record<TrackingStatus, number>) => {
    if (total === 0) return <Text style={styles.emptyText}>{t.noStatsData}</Text>;

    const statuses: TrackingStatus[] = ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'];
    
    // Calculate cumulative percentages for stacked bar
    let items: { status: TrackingStatus; width: number; color: string }[] = [];
    
    statuses.forEach(status => {
      const count = byStatus[status] || 0;
      if (count > 0) {
        const percentage = (count / total) * 100;
        items.push({ 
            status, 
            width: percentage, 
            color: getStatusColor(status) 
        });
      }
    });

    return (
      <View style={styles.graphContainer}>
        <View style={styles.stackedBar}>
            {items.map((item, index) => (
                <View 
                    key={item.status}
                    style={{
                        width: `${item.width}%`,
                        backgroundColor: item.color,
                        height: '100%',
                        borderTopLeftRadius: index === 0 ? 8 : 0,
                        borderBottomLeftRadius: index === 0 ? 8 : 0,
                        borderTopRightRadius: index === items.length - 1 ? 8 : 0,
                        borderBottomRightRadius: index === items.length - 1 ? 8 : 0,
                    }}
                />
            ))}
        </View>
      </View>
    );
  };

  const renderStatusLegend = (byStatus: Record<TrackingStatus, number>) => {
    const statuses: TrackingStatus[] = ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'];
    
    return (
        <View style={styles.legendContainer}>
            {statuses.map(status => {
                const count = byStatus[status] || 0;
                if (count === 0) return null;
                
                return (
                    <View key={status} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: getStatusColor(status) }]} />
                        <Text style={styles.legendText}>{getStatusLabel(status)} ({count})</Text>
                    </View>
                );
            })}
        </View>
    );
  };

  const renderGenreBars = (byGenre: Record<string, number>) => {
    const genres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).slice(0, 5); // Top 5
    const total = Object.values(byGenre).reduce((a, b) => a + b, 0);

    if (genres.length === 0) return <Text style={styles.emptyText}>{t.noStatsData}</Text>;

    return (
      <View style={styles.statsList}>
        {genres.map(([genre, count], index) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <View key={genre} style={styles.statRow}>
              <View style={styles.statLabelRow}>
                <Text style={styles.statRowLabel}>{genre}</Text>
                <Text style={styles.statRowValue}>{count}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${percentage}%`, backgroundColor: [Colors.primary, Colors.info, Colors.purple, Colors.success, Colors.warning][index % 5] }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.statistics}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['shows', 'movies', 'episodes'] as StatTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'shows' ? t.shows : tab === 'movies' ? t.movies : t.episodes}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'shows' && (
          <>
            <View style={styles.cardsRow}>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryValue}>{showStats.total}</Text>
                <Text style={styles.summaryLabel}>{t.totalShows}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.timeSpent}</Text>
            </View>
            <View style={[styles.summaryCard, { marginBottom: 24, alignItems: 'flex-start', width: '100%' }]}>
               <Text style={[styles.summaryValue, { fontSize: 24 }]}>{formatTime(showStats.timeSpent)}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.showsByStatus}</Text>
            </View>
            {renderStatusGraph(showStats.total, showStats.byStatus)}
            {renderStatusLegend(showStats.byStatus)}
          </>
        )}

        {activeTab === 'movies' && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{movieStats.total}</Text>
              <Text style={styles.summaryLabel}>{t.totalMovies}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.timeSpent}</Text>
            </View>
             <View style={[styles.summaryCard, { marginBottom: 24, alignItems: 'flex-start', width: '100%' }]}>
               <Text style={[styles.summaryValue, { fontSize: 24 }]}>{formatTime(movieStats.timeSpent)}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.moviesByStatus}</Text>
            </View>
            {renderStatusGraph(movieStats.total, movieStats.byStatus)}
            {renderStatusLegend(movieStats.byStatus)}
          </>
        )}

        {activeTab === 'episodes' && (
          <>
             <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{episodeStats.totalWatched}</Text>
              <Text style={styles.summaryLabel}>{t.totalEpisodes}</Text>
            </View>
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Shows by Episodes</Text>
            </View>
            <View style={styles.statsList}>
              {episodeStats.topShows.length > 0 ? episodeStats.topShows.map((item, index) => (
                <View key={item.name} style={styles.statRow}>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.statRowLabel}>{index + 1}. {item.name}</Text>
                    <Text style={styles.statRowValue}>{item.count}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        // Relative to the top show
                        { width: `${(item.count / episodeStats.topShows[0].count) * 100}%`, backgroundColor: Colors.primary }
                      ]} 
                    />
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>{t.noStatsData}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8, marginHorizontal: -8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  activeTab: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.primary },
  tabText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: Colors.text },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  summaryValue: { fontSize: 48, fontWeight: 'bold', color: Colors.primary },
  summaryLabel: { fontSize: 16, color: Colors.textSecondary, marginTop: 4 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  statsList: { gap: 16 },
  statRow: {},
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statRowLabel: { fontSize: 14, color: Colors.text },
  statRowValue: { fontSize: 14, color: Colors.textSecondary },
  progressBarBg: { height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 20 },
  cardsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  graphContainer: { height: 40, width: '100%', marginBottom: 16 },
  stackedBar: { flexDirection: 'row', height: '100%', borderRadius: 8, overflow: 'hidden' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 14, color: Colors.textSecondary },
});
