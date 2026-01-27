/**
 * Calendar Screen
 * Calendar view of upcoming releases
 */

import { strings } from '@/src/i18n/strings';
import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { getPosterUrl } from '@/src/services/api/client';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { TrackedMovie, TrackedShow } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// Configure calendar locale if needed, for now using default

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
  blue: '#3b82f6',
};

// Theme object for react-native-calendars
const calendarTheme = {
  backgroundColor: Colors.background,
  calendarBackground: Colors.background,
  textSectionTitleColor: Colors.textSecondary,
  selectedDayBackgroundColor: Colors.primary,
  selectedDayTextColor: '#ffffff',
  todayTextColor: Colors.primary,
  dayTextColor: Colors.text,
  textDisabledColor: '#333333',
  dotColor: Colors.primary,
  selectedDotColor: '#ffffff',
  arrowColor: Colors.primary,
  monthTextColor: Colors.text,
  indicatorColor: Colors.primary,
  textDayFontWeight: '400',
  textMonthFontWeight: 'bold',
  textDayHeaderFontWeight: '400',
  textDayFontSize: 16,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 14,
};

type CalendarItem = 
  | (TrackedShow & { type: 'show', releaseDate: string, episodeNumber?: number, seasonNumber?: number })
  | (TrackedMovie & { type: 'movie', releaseDate: string });

export default function CalendarScreen() {
  const router = useRouter();
  const { trackedShows, trackedMovies } = useWatchlistStore();
  const { language, getFormattedDate } = useSettingsStore();
  const t = strings[language] || strings.en;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Get all candidates for fetch
  const upcomingCandidateShows = useMemo(() => 
    trackedShows.filter(s => ['plan_to_watch', 'watching', 'completed'].includes(s.status)), 
    [trackedShows]
  );
  
  const planToWatchMovies = useMemo(() => 
    trackedMovies.filter(m => m.status === 'plan_to_watch'), 
    [trackedMovies]
  );

  // 2. Fetch details
  const showDetailsQueriesResult = useQueries({
    queries: upcomingCandidateShows.map(show => ({
      queryKey: ['show-details', show.showId, 'minimal'],
      queryFn: () => getShowDetails(show.showId, []),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours (cache aggressively)
      gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
    }))
  });

  const movieDetailsQueriesResult = useQueries({
    queries: planToWatchMovies.map(movie => ({
      queryKey: ['movie-details', movie.movieId, 'minimal'],
      queryFn: () => getMovieDetails(movie.movieId, []),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours (cache aggressively)
      gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
    }))
  });

  const isLoading = showDetailsQueriesResult.some(q => q.isLoading) || movieDetailsQueriesResult.some(q => q.isLoading);

  // 3. Process Data into Calendar Items
  const calendarData = useMemo(() => {
    const items: Record<string, CalendarItem[]> = {};

    // Process Shows
    const showDetailsMap = new Map(
        showDetailsQueriesResult.map(q => q.data ? [q.data.id, q.data] : null).filter((e): e is [number, any] => e !== null)
    );

    upcomingCandidateShows.forEach(show => {
        const details = showDetailsMap.get(show.showId);
        if (!details) return;

        // Check next episode
        const nextEp = details.next_episode_to_air;
        if (nextEp && nextEp.air_date) {
            const date = nextEp.air_date;
            if (!items[date]) items[date] = [];
            items[date].push({
                ...show,
                type: 'show',
                releaseDate: date,
                episodeNumber: nextEp.episode_number,
                seasonNumber: nextEp.season_number
            });
        }
    });

    // Process Movies
    const movieDetailsMap = new Map(
        movieDetailsQueriesResult.map(q => q.data ? [q.data.id, q.data] : null).filter((e): e is [number, any] => e !== null)
    );

    planToWatchMovies.forEach(movie => {
        const details = movieDetailsMap.get(movie.movieId);
        if (!details || !details.release_date) return;

        const date = details.release_date;
        if (!items[date]) items[date] = [];
        items[date].push({
            ...movie,
            type: 'movie',
            releaseDate: date
        });
    });

    return items;
  }, [showDetailsQueriesResult, movieDetailsQueriesResult, upcomingCandidateShows, planToWatchMovies]);

  // 4. Generate Marked Dates for Calendar
  const markedDates = useMemo(() => {
      const marks: any = {};
      
      // Add items dots
      Object.keys(calendarData).forEach(date => {
          const dayItems = calendarData[date];
          const dots = [];
          
          if (dayItems.some(i => i.type === 'show')) {
              dots.push({ key: 'show', color: Colors.blue });
          }
          if (dayItems.some(i => i.type === 'movie')) {
              dots.push({ key: 'movie', color: Colors.primary });
          }

          marks[date] = { dots };
      });

      // Add selected day styling (overrides or merges)
      if (marks[selectedDate]) {
          marks[selectedDate] = {
              ...marks[selectedDate],
              selected: true,
              selectedColor: Colors.primary
          };
      } else {
          marks[selectedDate] = {
              selected: true,
              selectedColor: Colors.primary
          };
      }

      return marks;
  }, [calendarData, selectedDate]);


  // Render Item
  const renderItem = ({ item }: { item: CalendarItem }) => (
    <TouchableOpacity 
        style={styles.itemCard}
        onPress={() => router.push(item.type === 'show' ? `/show/${item.showId}` : `/movie/${item.movieId}`)}
    >
        <Image 
            source={{ uri: getPosterUrl(item.posterPath, 'small') || '' }} 
            style={styles.itemPoster} 
        />
        <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.type === 'show' ? item.showName : item.movieTitle}</Text>
            <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: item.type === 'show' ? Colors.blue : Colors.primary }]}>
                    <Text style={styles.badgeText}>
                        {item.type === 'show' ? t.tvShow : t.movieCap}
                    </Text>
                </View>
                {item.type === 'show' && item.seasonNumber && (
                     <Text style={styles.episodeText}>
                        S{item.seasonNumber}:E{item.episodeNumber}
                     </Text>
                )}
            </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.upcomingCalendar}</Text>
      </View>

      <Calendar
        theme={calendarTheme as any}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        enableSwipeMonths={true}
        markingType={'multi-dot'}
      />

      <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>
            {getFormattedDate(selectedDate)}
          </Text>

          {isLoading && !calendarData[selectedDate] ? (
            <View style={[styles.emptyContainer, { justifyContent: 'flex-start', paddingTop: 32 }]}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
            data={calendarData[selectedDate] || []}
            keyExtractor={(item) => `${item.type}-${item.type === 'show' ? item.showId : item.movieId}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>{t.noReleasesDay}</Text>
                </View>
            }
          />
          )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  listContainer: { flex: 1, backgroundColor: Colors.surface, marginTop: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  listContent: { paddingBottom: 24 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  itemPoster: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#333' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  episodeText: { fontSize: 13, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary, marginTop: 12 },
});
